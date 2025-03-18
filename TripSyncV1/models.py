from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

class User(UserMixin, db.Model):
    """User model for authentication and profile information."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    profile_picture = db.Column(db.String(512), nullable=True)
    university = db.Column(db.String(100), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    rides_offered = db.relationship('Ride', backref='driver', lazy=True)
    bookings = db.relationship('Booking', backref='passenger', lazy=True)
    reviews_received = db.relationship('Review', 
                                      foreign_keys='Review.reviewee_id',
                                      backref='reviewee', 
                                      lazy=True)
    reviews_given = db.relationship('Review', 
                                   foreign_keys='Review.reviewer_id',
                                   backref='reviewer', 
                                   lazy=True)
    
    def set_password(self, password):
        """Set the password hash for the user."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if the password matches the hash."""
        return check_password_hash(self.password_hash, password)
    
    @property
    def rating(self):
        """Calculate the average rating from all reviews."""
        reviews = self.reviews_received
        if not reviews:
            return 0
        return sum(review.rating for review in reviews) / len(reviews)

class Ride(db.Model):
    """Ride model for carpooling trips."""
    id = db.Column(db.Integer, primary_key=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    from_location = db.Column(db.String(255), nullable=False)
    to_location = db.Column(db.String(255), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.Time, nullable=False)
    price = db.Column(db.Float, nullable=False)
    total_seats = db.Column(db.Integer, nullable=False)
    available_seats = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='active')  # active, completed, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    bookings = db.relationship('Booking', backref='ride', lazy=True, 
                              cascade="all, delete-orphan")

class Booking(db.Model):
    """Booking model for ride reservations."""
    id = db.Column(db.Integer, primary_key=True)
    ride_id = db.Column(db.Integer, db.ForeignKey('ride.id'), nullable=False)
    passenger_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), default='confirmed')  # confirmed, cancelled
    seats_booked = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate bookings
    __table_args__ = (db.UniqueConstraint('ride_id', 'passenger_id', name='unique_booking'),)

class Review(db.Model):
    """Review model for user ratings."""
    id = db.Column(db.Integer, primary_key=True)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    reviewee_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    ride_id = db.Column(db.Integer, db.ForeignKey('ride.id'), nullable=True)
    rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent multiple reviews for the same ride
    __table_args__ = (db.UniqueConstraint('reviewer_id', 'reviewee_id', 'ride_id', name='unique_review'),)

# Additional models for university verification and messaging can be added later
