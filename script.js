'use strict';

const form = document.querySelector('.form');
const btnDeleteAll = document.querySelector('.workout__delete-all');
const btnSort = document.querySelector('.workout__sort');
const btnShowWorkouts = document.querySelector('.workout__all');
const modal = document.querySelector('.modal');
const closeModalBtn = document.querySelector('.close-modal');
const overlay = document.querySelector('.overlay');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Runing extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

class App {
    #map;
    #mapEvent;
    #mapZoomLevel = 13;
    #workouts = [];
    #isEdit = false;
    #isSort = false;
    #editWorkOutId;

    constructor()  {
        //Get user position
        this._getPosition();

        //Get local storage
        this._getLocalStorage();

        //Shown button delete all
        this._showButtonDeleteAll();

        //Show button sort
        this._showButtonSort();

        //Show button all workouts
        this._showButtonAllWorkouts();

        //Attach events
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
        containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
        containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
        btnDeleteAll.addEventListener('click', this._deleteAllWorkouts.bind(this));
        btnSort.addEventListener('click', this._sortWorkouts.bind(this));
        btnShowWorkouts.addEventListener('click', this._showAllWorkouts.bind(this));

        this.boundCloseModal = this._closeModal.bind(this);
        this.boundCloseModalKey = this._closeModalKey.bind(this);
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
                    alert('Could not get your position');
                }
            );
        }
    }

    _loadMap(position) {
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        
        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach( workout => {
            this._renderWorkOutMarker(workout);
        })
    }

    _showForm(mapEvt) {
        if (this.#isEdit === true && !form.classList.contains('hidden')) {
            this._hideForm();
            this.#isEdit = false;
        }

        this.#mapEvent = mapEvt;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _toggleElevationField()  {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _validInputs = (...inputs) => inputs.every(item => Number.isFinite(item));

    _allPositive = (...inputs) => inputs.every(item => item > 0);

    _newWorkout(evt) {
        evt.preventDefault();

        if (this.#isEdit) {
            this._editDataWorkout();
            return;
        }

        //Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;

        //If workout running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            //if data is valid
            if (!this._validInputs(distance, duration, cadence) || !this._allPositive(distance, duration, cadence)) {
                this._showErrorMessage();
                return;
            }

            workout = new Runing([lat, lng], distance, duration, cadence);
        }

        //If workout cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            //if data is valid
            if (!this._validInputs(distance, duration, elevation) || !this._allPositive(distance, duration)) {
                this._showErrorMessage();
                return;
            }

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        this.#workouts.push(workout);

        this._showButtonDeleteAll();

        this._showButtonSort();

        this._showButtonAllWorkouts();
    
        //Render workout on map as marker
        this._renderWorkOutMarker(workout);

        //Rednder workout on list
        this._renderWorkout(workout);

        //Hide form + clear inputs value
        this._hideForm();

        //Set local storage
        this._setLocalStorage();

    }

    _renderWorkOutMarker (workout) {
        L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(
            L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            })
        )
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
        .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <div class="workout__header">
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__actions">
                    <button class="workout__button workout__edit" type="button">Edit</button>
                    <button class="workout__button workout__delete" type="button">Delete</button>
                </div>
            </div>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
        `;

        if (workout.type === 'running') {
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
            </li>
        `;
        }

        if (workout.type === 'cycling') {
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
            </div>
            </li>
            `;
        }

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(evt)  {
        const workoutEl = evt.target.closest('.workout');

        if(!workoutEl) return;

        const workout = this.#workouts.find(item => item.id === workoutEl.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            }
        });
    }

    _editWorkout(evt) {
        const btnEdit = evt.target.closest('.workout__edit');

        if(!btnEdit) return;

        this.#isEdit = true;
        this.#editWorkOutId = btnEdit.closest('.workout').dataset.id;

        const curWorkout = this.#workouts.find(item => item.id ===  this.#editWorkOutId);

        inputType.value = curWorkout.type;
        inputDistance.value = curWorkout.distance;
        inputDuration.value = curWorkout.duration;

        if (curWorkout.type === 'running') {
            inputCadence.value = curWorkout.cadence;
            if (inputCadence.closest('.form__row').classList.contains('form__row--hidden')) {
                this._toggleElevationField();
            }
        }

        if (curWorkout.type === 'cycling') {
            inputElevation.value = curWorkout.elevationGain;
            if (inputElevation.closest('.form__row').classList.contains('form__row--hidden')) {
                this._toggleElevationField();
            }
        }
        
        if (form.classList.contains('hidden')) {
            this._showForm();
        }
    }

    _editDataWorkout() {
        const workout = containerWorkouts.querySelector(`[data-id="${this.#editWorkOutId}"]`);
        const curWorkout = this.#workouts.find(item => item.id ===  this.#editWorkOutId);

        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const curDescription = workout.querySelector('.workout__title').innerText;
        const newType =  `${type[0].toUpperCase()}${type.slice(1)}`;
        const newDescription = `${newType} ${curDescription.split(' ').splice(1).join(' ')}`; 
        
        curWorkout.type = type;
        curWorkout.distance = distance;
        curWorkout.duration = duration;
        curWorkout.description = newDescription;

        if (type === 'running') {
            const cadence = +inputCadence.value;
            curWorkout.cadence = cadence;
            curWorkout.pace = duration / distance;

            if (!this._validInputs(distance, duration, cadence) || !this._allPositive(distance, duration, cadence)) {
                this._showErrorMessage();
                return;
            }
        }

        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            curWorkout.elevationGain = elevation;
            curWorkout.speed = distance / (duration / 60);
            
            if (!this._validInputs(distance, duration, elevation) || !this._allPositive(distance, duration)) {
                this._showErrorMessage();
                return;
            }
        }

        workout.remove();
        this._renderWorkout(curWorkout);

        //Change popup marker
        const [lat, lng] = curWorkout.coords;
        const workoutClassName = `${curWorkout.type}-popup`;
        this.#map.eachLayer(function(layer) {
            if (layer instanceof L.Marker && (layer._latlng.lat === lat && layer._latlng.lng === lng))  {
                if (!layer._popup._container.classList.contains(workoutClassName)) {
                    layer._popup._container.classList.remove(layer._popup.options.className);
                    layer._popup._container.classList.add(workoutClassName);
                }
                layer._popup.setContent(`${curWorkout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${newDescription}`)
                .update();
            }
        });

        this._hideForm();

        this._clearLocalStorage();
        this._setLocalStorage();
        this.#isEdit = false;
    }

    _deleteWorkout(evt) {
        const btnDelete = evt.target.closest('.workout__delete');

        if(!btnDelete) return;

        const workoutId = btnDelete.closest('.workout').dataset.id;
        const curWorkout = this.#workouts.find(item => item.id ===  workoutId);
        const workout = containerWorkouts.querySelector(`[data-id="${workoutId}"]`);

        workout.remove();
        this.#workouts = this.#workouts.filter(item => item.id !==  workoutId);

        if (this.#workouts.length === 0) {
            btnDeleteAll.classList.add('hidden');
            btnShowWorkouts.classList.add('hidden');
        }

        if (this.#workouts.length === 1) {
            btnSort.classList.add('hidden');
        }

        //Remove marker
        const [lat, lng] = curWorkout.coords;
        this.#map.eachLayer(function(layer) {
            if (layer instanceof L.Marker && (layer._latlng.lat === lat && layer._latlng.lng === lng))  {
                layer.remove();
            }
        });

        this._clearLocalStorage();
        this._setLocalStorage();
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _deleteAllWorkouts() {
        const workouts = document.querySelectorAll('.workout');

        workouts.forEach(workout => workout.remove());
        this.#workouts = [];

        this.#map.eachLayer(function(layer) {
            if (layer instanceof L.Marker)  {
                layer.remove();
            }
        });

        btnDeleteAll.classList.add('hidden');
        btnSort.classList.add('hidden');
        btnShowWorkouts.classList.add('hidden');
        this._clearLocalStorage();
    }

    _showButtonDeleteAll() {
        if (!this.#workouts.length) return;

        btnDeleteAll.classList.remove('hidden')
    }

    _sortWorkouts() {
        this.#isSort = !this.#isSort;

        const workoutEl = containerWorkouts.querySelectorAll('.workout');
        workoutEl.forEach(el => el.remove());

        const workouts = this.#isSort ? this.#workouts.slice().sort((a, b) => a.distance - b.distance ) : this.#workouts;
        
        workouts.forEach(workout => this._renderWorkout(workout));
    }

    _showButtonSort() {
        if (this.#workouts.length < 2) return;

        btnSort.classList.remove('hidden')
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        data.forEach(obj => {
            const workout = (obj.type === 'running') ? Object.assign(new Runing(), obj) : Object.assign(new Cycling(), obj);
            this.#workouts.push(workout);
        })

        this.#workouts.forEach( workout => {
            this._renderWorkout(workout);
        })
    }

    _clearLocalStorage() {
        localStorage.removeItem('workouts');
    }

    reset()   {
        localStorage.removeItem('workouts');
        location.reload();
    }

    _showErrorMessage() {
        modal.classList.remove('hidden');
        overlay.classList.remove('hidden');

        closeModalBtn.addEventListener('click', this.boundCloseModal);
        document.addEventListener('keydown', this.boundCloseModalKey);
    }

    _closeModal() {
        modal.classList.add('hidden');
        overlay.classList.add('hidden');

        closeModalBtn.removeEventListener('click', this.boundCloseModal);
        document.removeEventListener('keydown', this.boundCloseModalKey);
    }

    _closeModalKey(evt) {
        if (evt.key === 'Escape' && !modal.classList.contains('hidden')) {
            this._closeModal();
        }
    }

    _showAllWorkouts() {
        const allMArkers = [];

        this.#map.eachLayer(function(layer) {
            if (layer instanceof L.Marker)  {
                allMArkers.push(layer);
            }
        });

        const group = new L.featureGroup(allMArkers);
        this.#map.fitBounds(group.getBounds());
    }

    _showButtonAllWorkouts() {
        if (!this.#workouts.length) return;

        btnShowWorkouts.classList.remove('hidden')
    }
}

const app = new App();