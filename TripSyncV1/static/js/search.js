// Search functionality for TripSync

function initSearchPage() {
    // Get search parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get('from') || '';
    const toParam = urlParams.get('to') || '';
    const dateParam = urlParams.get('date') || '';
    
    // Set search form values
    const fromInput = document.querySelector('input[name="from"]');
    const toInput = document.querySelector('input[name="to"]');
    const dateInput = document.querySelector('input[name="date"]');
    
    if (fromInput) fromInput.value = fromParam;
    if (toInput) toInput.value = toParam;
    if (dateInput) dateInput.value = dateParam;
    
    // Perform search
    performSearch(fromParam, toParam, dateParam);
    
    // Add event listener to search form
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const from = fromInput ? fromInput.value.trim() : '';
            const to = toInput ? toInput.value.trim() : '';
            const date = dateInput ? dateInput.value : '';
            
            // Update URL with search parameters
            const url = new URL(window.location);
            url.searchParams.set('from', from);
            url.searchParams.set('to', to);
            url.searchParams.set('date', date);
            window.history.pushState({}, '', url);
            
            // Perform search with new parameters
            performSearch(from, to, date);
        });
    }
    
    // Add event listeners to filters
    const filters = document.querySelectorAll('.filter');
    filters.forEach(filter => {
        filter.addEventListener('click', function() {
            this.classList.toggle('filter-active');
            applyFilters();
        });
    });
}

async function performSearch(from, to, date) {
    const resultsContainer = document.querySelector('.ride-list');
    const loadingIndicator = document.querySelector('.loading-indicator');
    const noResultsMessage = document.querySelector('.no-results');
    
    if (!resultsContainer) return;
    
    // Show loading indicator
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (noResultsMessage) noResultsMessage.style.display = 'none';
    
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from,
                to,
                date
            })
        });
        
        const rides = await response.json();
        
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        if (rides.length === 0) {
            // Show no results message
            if (noResultsMessage) noResultsMessage.style.display = 'block';
            if (resultsContainer) resultsContainer.innerHTML = '';
        } else {
            // Show results
            if (resultsContainer) resultsContainer.style.display = 'block';
            if (noResultsMessage) noResultsMessage.style.display = 'none';
            
            // Render rides
            renderRides(rides, resultsContainer);
        }
    } catch (error) {
        console.error('Search error:', error);
        
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        // Show error message
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>An error occurred while searching for rides. Please try again.</p>
                </div>
            `;
        }
    }
}

function renderRides(rides, container) {
    // Clear container
    container.innerHTML = '';
    
    // Render each ride
    rides.forEach(ride => {
        const rideCard = document.createElement('div');
        rideCard.className = 'card ride-card mb-3';
        
        rideCard.innerHTML = `
            <div class="ride-info">
                <div class="ride-route">
                    <h3>${ride.from}</h3>
                    <span class="ride-route-arrow"><i class="fas fa-arrow-right"></i></span>
                    <h3>${ride.to}</h3>
                </div>
                
                <div class="ride-details">
                    <div class="ride-detail">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(ride.date)}</span>
                    </div>
                    
                    <div class="ride-detail">
                        <i class="fas fa-clock"></i>
                        <span>${formatTime(ride.time)}</span>
                    </div>
                    
                    <div class="ride-detail">
                        <i class="fas fa-user-friends"></i>
                        <span>${ride.available_seats} seat${ride.available_seats !== '1' ? 's' : ''} available</span>
                    </div>
                </div>
                
                <div class="ride-driver">
                    <img src="https://ui-avatars.com/api/?name=Driver&background=random" alt="Driver" class="ride-driver-photo">
                    <div>
                        <div class="ride-driver-name">Driver</div>
                        <div class="ride-driver-rating">
                            <i class="fas fa-star"></i>
                            <span>4.8</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="ride-price">
                <div class="ride-price-amount">${formatCurrency(ride.price)}</div>
                <a href="/ride/${ride.id}" class="btn btn-primary">View Details</a>
            </div>
        `;
        
        container.appendChild(rideCard);
    });
}

function applyFilters() {
    // Get active filters
    const activeFilters = document.querySelectorAll('.filter-active');
    
    // If no active filters, show all rides
    if (activeFilters.length === 0) {
        document.querySelectorAll('.ride-card').forEach(card => {
            card.style.display = 'flex';
        });
        return;
    }
    
    // Get filter values
    const filterValues = Array.from(activeFilters).map(filter => {
        return filter.getAttribute('data-filter');
    });
    
    // Filter rides based on active filters
    document.querySelectorAll('.ride-card').forEach(card => {
        const rideData = card.getAttribute('data-ride');
        
        // Check if ride matches any active filter
        const matchesFilter = filterValues.some(value => {
            return rideData && rideData.includes(value);
        });
        
        card.style.display = matchesFilter ? 'flex' : 'none';
    });
}
