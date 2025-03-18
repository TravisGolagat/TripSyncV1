// Offer Ride functionality for TripSync

function initOfferPage() {
    // Check if user is logged in
    if (!isLoggedIn()) {
        // Store current page URL for redirect after login
        localStorage.setItem('redirectAfterLogin', window.location.href);

        // Redirect to login page
        window.location.href = '/auth?action=login';
        return;
    }

    const offerForm = document.querySelector('.offer-form');

    if (offerForm) {
        // Set minimum date to today
        const dateInput = document.querySelector('input[name="date"]');
        if (dateInput) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            dateInput.min = `${yyyy}-${mm}-${dd}`;
        }

        // Form submission handler
        offerForm.addEventListener('submit', handleOfferSubmit);
    }
}

async function handleOfferSubmit(e) {
    e.preventDefault();

    // Get form inputs
    const fromInput = document.querySelector('input[name="from"]');
    const toInput = document.querySelector('input[name="to"]');
    const dateInput = document.querySelector('input[name="date"]');
    const timeInput = document.querySelector('input[name="time"]');
    const priceInput = document.querySelector('input[name="price"]');
    const seatsInput = document.querySelector('input[name="seats"]');
    const submitButton = document.querySelector('.offer-form button[type="submit"]');

    // Form validation
    if (!fromInput.value.trim()) {
        createFlashMessage('Please enter a pickup location', 'error');
        fromInput.focus();
        return;
    }

    if (!toInput.value.trim()) {
        createFlashMessage('Please enter a destination', 'error');
        toInput.focus();
        return;
    }

    if (!dateInput.value) {
        createFlashMessage('Please select a date', 'error');
        dateInput.focus();
        return;
    }

    if (!timeInput.value) {
        createFlashMessage('Please select a time', 'error');
        timeInput.focus();
        return;
    }

    if (!priceInput.value || isNaN(priceInput.value) || parseFloat(priceInput.value) <= 0) {
        createFlashMessage('Please enter a valid price', 'error');
        priceInput.focus();
        return;
    }

    if (!seatsInput.value || isNaN(seatsInput.value) || parseInt(seatsInput.value) <= 0) {
        createFlashMessage('Please enter a valid number of seats', 'error');
        seatsInput.focus();
        return;
    }

    // Update button state
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loader"></span>';

    // Create ride data object
    const rideData = {
        from: fromInput.value.trim(),
        to: toInput.value.trim(),
        date: dateInput.value,
        time: timeInput.value,
        price: priceInput.value,
        seats: seatsInput.value
    };

    try {
        const response = await fetch('/api/rides', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rideData)
        });

        const data = await response.json();

        if (response.ok) {
            // Successful ride creation
            createFlashMessage('Your ride has been posted successfully!');

            // Reset form
            e.target.reset();

            // Redirect to home page after delay
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            // Ride creation failed
            createFlashMessage(data.error || 'Failed to post your ride. Please try again.', 'error');

            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    } catch (error) {
        console.error('Offer ride error:', error);
        createFlashMessage('An error occurred while posting your ride. Please try again.', 'error');

        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}