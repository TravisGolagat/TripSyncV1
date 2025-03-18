import os
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from sqlalchemy.orm import DeclarativeBase
from werkzeug.security import generate_password_hash, check_password_hash
from email_validator import validate_email, EmailNotValidError

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Define base class for SQLAlchemy models
class Base(DeclarativeBase):
    pass

# Initialize Flask extensions
db = SQLAlchemy(model_class=Base)
login_manager = LoginManager()

# Create the Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Configure the database connection
if os.environ.get("DATABASE_URL"):
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
else:
    # If DATABASE_URL isn't set directly, construct it from individual params
    db_user = os.environ.get("PGUSER", "postgres")
    db_password = os.environ.get("PGPASSWORD", "postgres")
    db_host = os.environ.get("PGHOST", "localhost")
    db_port = os.environ.get("PGPORT", "5432")
    db_name = os.environ.get("PGDATABASE", "postgres")
    
    app.config["SQLALCHEMY_DATABASE_URI"] = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize extensions with the app
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'auth'
login_manager.login_message = 'Please log in to access this page.'

# Configure app constants
app.config['BRAND'] = {
    'NAME': 'TripSync',
    'UNIVERSITY': 'MMCL',
    'DESCRIPTION': 'University Carpooling Platform',
    'PRIMARY_COLOR': '#800000',  # Maroon (MMCL color)
    'SECONDARY_COLOR': '#FFD700',  # Gold (MMCL accent color)
    'LOGO_URL': '/static/images/mmcl-logo.svg'
}

# Routes
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/search')
def search():
    return render_template('search.html')

@app.route('/offer')
def offer():
    if not current_user.is_authenticated:
        flash("Please log in to offer a ride", "error")
        return redirect(url_for('auth', action='login'))
    return render_template('offer.html')

@app.route('/auth')
def auth():
    action = request.args.get('action', 'login')
    return render_template('auth.html', action=action)

@app.route('/ride/<int:ride_id>')
def ride_details(ride_id):
    from models import Ride, User, Booking
    
    ride = Ride.query.get_or_404(ride_id)
    driver = User.query.get(ride.driver_id)
    
    # Get bookings for this ride
    bookings = Booking.query.filter_by(ride_id=ride_id, status='confirmed').all()
    passengers = [User.query.get(booking.passenger_id) for booking in bookings]
    
    # Check if current user has booked this ride
    user_has_booked = False
    if current_user.is_authenticated:
        user_has_booked = Booking.query.filter_by(
            ride_id=ride_id, 
            passenger_id=current_user.id,
            status='confirmed'
        ).first() is not None
    
    return render_template(
        'ride_details.html', 
        ride=ride, 
        driver=driver, 
        passengers=passengers,
        user_has_booked=user_has_booked
    )

@app.route('/profile/<int:user_id>')
def profile(user_id):
    from models import User, Ride, Review
    
    user = User.query.get_or_404(user_id)
    
    # Get rides offered by this user
    rides_offered = Ride.query.filter_by(driver_id=user_id).all()
    
    # Get reviews for this user
    reviews = Review.query.filter_by(reviewee_id=user_id).all()
    
    return render_template(
        'profile.html', 
        user=user, 
        rides_offered=rides_offered,
        reviews=reviews
    )

@app.route('/dashboard')
@login_required
def dashboard():
    from models import User, Ride, Booking
    from datetime import datetime
    
    # Get today's date for filtering
    today = datetime.now().date()
    
    # Get user's bookings
    user_bookings = Booking.query.filter_by(
        passenger_id=current_user.id,
        status='confirmed'
    ).all()
    
    # Get rides user has booked
    booked_rides = []
    for booking in user_bookings:
        ride = Ride.query.get(booking.ride_id)
        if ride:
            driver = User.query.get(ride.driver_id)
            booked_rides.append({
                'ride': ride,
                'driver': driver,
                'booking': booking
            })
    
    # Get rides offered by the user
    offered_rides = Ride.query.filter_by(driver_id=current_user.id).all()
    
    return render_template(
        'dashboard.html', 
        user=current_user,
        booked_rides=booked_rides,
        offered_rides=offered_rides,
        today=today
    )

@app.route('/faq')
def faq():
    return render_template('faq.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

# Context processor to inject brand information into all templates
@app.context_processor
def inject_brand():
    return {'brand': app.config['BRAND']}

# API Routes
@app.route('/api/search', methods=['POST'])
def api_search():
    from models import Ride, User
    data = request.get_json()
    from_location = data.get('from', '').lower()
    to_location = data.get('to', '').lower()
    date_str = data.get('date')
    
    # Build query
    query = Ride.query.filter(Ride.status == 'active')
    
    if from_location:
        query = query.filter(Ride.from_location.ilike(f'%{from_location}%'))
    
    if to_location:
        query = query.filter(Ride.to_location.ilike(f'%{to_location}%'))
    
    if date_str:
        try:
            search_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter(Ride.date == search_date)
        except ValueError:
            pass
    
    # Execute query
    rides = query.all()
    
    # Format results
    results = []
    for ride in rides:
        driver = User.query.get(ride.driver_id)
        results.append({
            'id': ride.id,
            'driver_id': ride.driver_id,
            'driver_name': driver.name if driver else 'Unknown',
            'driver_picture': driver.profile_picture if driver else None,
            'driver_rating': driver.rating if driver else 0,
            'from': ride.from_location,
            'to': ride.to_location,
            'date': ride.date.strftime('%Y-%m-%d'),
            'time': ride.time.strftime('%H:%M'),
            'price': float(ride.price),
            'total_seats': ride.total_seats,
            'available_seats': ride.available_seats
        })
    
    return jsonify(results)

@app.route('/api/rides', methods=['POST'])
@login_required
def api_create_ride():
    from models import Ride
    
    data = request.get_json()
    
    try:
        # Parse date and time from the request
        date_obj = datetime.strptime(data.get('date'), '%Y-%m-%d').date()
        time_obj = datetime.strptime(data.get('time'), '%H:%M').time()
        
        # Create a new ride
        new_ride = Ride(
            driver_id=current_user.id,
            from_location=data.get('from'),
            to_location=data.get('to'),
            date=date_obj,
            time=time_obj,
            price=float(data.get('price')),
            total_seats=int(data.get('seats')),
            available_seats=int(data.get('seats')),
            description=data.get('description', '')
        )
        
        db.session.add(new_ride)
        db.session.commit()
        
        return jsonify({'success': True, 'ride_id': new_ride.id})
    
    except (ValueError, TypeError) as e:
        return jsonify({'error': f'Invalid input data: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create ride: {str(e)}'}), 500

@app.route('/api/rides/<int:ride_id>/book', methods=['POST'])
@login_required
def api_book_ride(ride_id):
    from models import Ride, Booking
    
    ride = Ride.query.get_or_404(ride_id)
    
    # Check if there are available seats
    if ride.available_seats <= 0:
        return jsonify({'error': 'No seats available'}), 400
    
    # Check if the user has already booked this ride
    existing_booking = Booking.query.filter_by(
        ride_id=ride_id,
        passenger_id=current_user.id,
        status='confirmed'
    ).first()
    
    if existing_booking:
        return jsonify({'error': 'You have already booked this ride'}), 400
    
    # Check if user is trying to book their own ride
    if ride.driver_id == current_user.id:
        return jsonify({'error': 'You cannot book your own ride'}), 400
    
    try:
        # Create a new booking
        booking = Booking(
            ride_id=ride_id,
            passenger_id=current_user.id,
            seats_booked=1,
            status='confirmed'
        )
        
        # Reduce available seats
        ride.available_seats -= booking.seats_booked
        
        db.session.add(booking)
        db.session.commit()
        
        return jsonify({'success': True})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to book ride: {str(e)}'}), 500

@app.route('/api/auth/register', methods=['POST'])
def api_register():
    from models import User
    
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    university = data.get('university', '')
    
    if not all([name, email, password]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check for valid email format
    try:
        valid = validate_email(email)
        email = valid.email
    except EmailNotValidError as e:
        return jsonify({'error': f'Invalid email: {str(e)}'}), 400
    
    # Check if email already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    try:
        # Create a new user
        new_user = User(
            name=name,
            email=email,
            university=university,
            profile_picture=f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=800000&color=FFD700"
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        # Log the user in
        login_user(new_user)
        
        return jsonify({'success': True, 'user_id': new_user.id})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to register: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    from models import User
    
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not all([email, password]):
        return jsonify({'error': 'Missing email or password'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Log the user in with Flask-Login
    login_user(user)
    
    return jsonify({'success': True, 'user_id': user.id})

@app.route('/api/auth/logout', methods=['POST'])
@login_required
def api_logout():
    logout_user()
    return jsonify({'success': True})

@app.route('/api/profile/rate', methods=['POST'])
@login_required
def api_rate_user():
    from models import User, Review, Ride
    
    data = request.get_json()
    user_id = data.get('user_id')
    ride_id = data.get('ride_id')
    rating = data.get('rating')
    comment = data.get('comment', '')
    
    # Validate the input
    try:
        user_id = int(user_id)
        rating = int(rating)
        
        if not (1 <= rating <= 5):
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid rating or user ID'}), 400
    
    # Check if the user exists
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Optional: Check if ride exists if ride_id is provided
    if ride_id:
        ride = Ride.query.get(ride_id)
        if not ride:
            return jsonify({'error': 'Ride not found'}), 404
    
    # Check for existing review (to prevent duplicates)
    existing_review = Review.query.filter_by(
        reviewer_id=current_user.id,
        reviewee_id=user_id,
        ride_id=ride_id
    ).first()
    
    if existing_review:
        # Update the existing review
        existing_review.rating = rating
        existing_review.comment = comment
        
        try:
            db.session.commit()
            return jsonify({'success': True, 'updated': True})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to update review: {str(e)}'}), 500
    
    # Create a new review
    new_review = Review(
        reviewer_id=current_user.id,
        reviewee_id=user_id,
        ride_id=ride_id,
        rating=rating,
        comment=comment
    )
    
    try:
        db.session.add(new_review)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to add review: {str(e)}'}), 500

# Initialize database with sample data
with app.app_context():
    from models import User, Ride, Booking, Review
    
    # Import the db models and create all tables
    db.create_all()
    
    # Check if we need to populate the database with initial data
    if User.query.count() == 0:
        # Create some sample users
        user1 = User(
            name="John Smith",
            email="john@mmcl.edu.ph",
            profile_picture="https://ui-avatars.com/api/?name=John+Smith&background=800000&color=FFD700",
            university="MMCL"
        )
        user1.set_password("password123")
        
        user2 = User(
            name="Sarah Johnson",
            email="sarah@ateneo.edu.ph",
            profile_picture="https://ui-avatars.com/api/?name=Sarah+Johnson&background=00008B&color=FFFFFF",
            university="Ateneo de Manila University"
        )
        user2.set_password("password123")
        
        user3 = User(
            name="Miguel Santos",
            email="miguel@up.edu.ph",
            profile_picture="https://ui-avatars.com/api/?name=Miguel+Santos&background=7B1113&color=FFFFFF",
            university="UP Diliman"
        )
        user3.set_password("password123")
        
        user4 = User(
            name="Jasmine Reyes",
            email="jasmine@dlsu.edu.ph",
            profile_picture="https://ui-avatars.com/api/?name=Jasmine+Reyes&background=006633&color=FFFFFF",
            university="De La Salle University"
        )
        user4.set_password("password123")
        
        user5 = User(
            name="Carlos Rodriguez",
            email="carlos@ust.edu.ph",
            profile_picture="https://ui-avatars.com/api/?name=Carlos+Rodriguez&background=FEC000&color=000000",
            university="UST"
        )
        user5.set_password("password123")
        
        db.session.add_all([user1, user2, user3, user4, user5])
        db.session.commit()
        
        # Create some sample rides (after users are committed to get their IDs)
        ride1 = Ride(
            driver_id=user1.id,
            from_location="MMCL Main Campus",
            to_location="Ateneo de Manila University",
            date=datetime.strptime("2025-03-20", "%Y-%m-%d").date(),
            time=datetime.strptime("08:00", "%H:%M").time(),
            price=250.00,
            total_seats=3,
            available_seats=2,
            description="Morning ride from MMCL to Ateneo. Will pass through EDSA."
        )
        
        ride2 = Ride(
            driver_id=user2.id,
            from_location="Ateneo de Manila University",
            to_location="De La Salle University",
            date=datetime.strptime("2025-03-21", "%Y-%m-%d").date(),
            time=datetime.strptime("10:00", "%H:%M").time(),
            price=300.00,
            total_seats=4,
            available_seats=4,
            description="Heading to DLSU for an inter-university event. Can pick up along the way."
        )
        
        ride3 = Ride(
            driver_id=user3.id,
            from_location="UP Diliman",
            to_location="MMCL Main Campus",
            date=datetime.strptime("2025-03-22", "%Y-%m-%d").date(),
            time=datetime.strptime("09:00", "%H:%M").time(),
            price=275.00,
            total_seats=2,
            available_seats=2,
            description="Weekend ride from UP to MMCL. Planning to stop for breakfast on the way."
        )
        
        ride4 = Ride(
            driver_id=user4.id,
            from_location="De La Salle University",
            to_location="UST",
            date=datetime.strptime("2025-03-23", "%Y-%m-%d").date(),
            time=datetime.strptime("14:00", "%H:%M").time(),
            price=200.00,
            total_seats=3,
            available_seats=2,
            description="Afternoon ride to UST. Air-conditioned car with free WiFi."
        )
        
        ride5 = Ride(
            driver_id=user5.id,
            from_location="UST",
            to_location="UP Diliman",
            date=datetime.strptime("2025-03-24", "%Y-%m-%d").date(),
            time=datetime.strptime("16:00", "%H:%M").time(),
            price=325.00,
            total_seats=4,
            available_seats=3,
            description="Evening ride to UP. Taking the Quezon Avenue route."
        )
        
        db.session.add_all([ride1, ride2, ride3, ride4, ride5])
        
        # Create a booking for demonstration
        booking1 = Booking(
            ride_id=1,
            passenger_id=user2.id,
            seats_booked=1
        )
        
        # Add some reviews
        review1 = Review(
            reviewer_id=user2.id,
            reviewee_id=user1.id,
            ride_id=1,
            rating=5,
            comment="Great driver, very punctual and the car was clean!"
        )
        
        db.session.add_all([booking1, review1])
        db.session.commit()
        
        # Update available seats for ride1 after the booking
        ride1.available_seats = ride1.total_seats - booking1.seats_booked
        db.session.commit()
        
        print("Database initialized with sample data.")
