// Booking functionality for TripSync

function initRideDetailsPage() {
    const bookingForm = document.querySelector('.booking-form');
    
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBooking);
    }
}

async function handleBooking(e) {
    e.preventDefault();
    
    // Check if user is logged in
    if (!isLoggedIn()) {
        // Store current page URL for redirect after login
        localStorage.setItem('redirectAfterLogin', window.location.href);
        
        // Redirect to login page
        window.location.href = '/auth?action=login';
        return;
    }
    
    const rideId = e.target.getAttribute('data-ride-id');
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    // Update button state
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loader"></span>';
    
    try {
        const response = await fetch(`/api/rides/${rideId}/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Successful booking
            createFlashMessage('Your ride has been booked successfully!');
            
            // Redirect to dashboard after delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        } else {
            // Booking failed
            createFlashMessage(data.error || 'Failed to book the ride. Please try again.', 'error');
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    } catch (error) {
        console.error('Booking error:', error);
        createFlashMessage('An error occurred while booking the ride. Please try again.', 'error');
        
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}
