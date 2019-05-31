let backdrop = document.querySelector('[data-id="backdrop"]');
let notifier = document.querySelector('.notifier');

let baseUrl = 'https://esi.evetech.net/dev';
let defaultImageKey = 'px64x64';

let parsers = {
	birthday: value => {
		let date = new Date(value);
		return date.toLocaleString();
	},
	date_founded: value => {
		let date = new Date(value);
		return date.toLocaleString();
	},
	gender: value => {
		let messages = {
			male: 'мужской',
			female: 'женский'
		};
		return messages[value];
	},
	security_status: value => value.toFixed(2),
	tax_rate: value => value * 100,
	portrait: value => {
		let image = new Image();
		image.src = value;
		return image;
	},
	icon: value => {
		let image = new Image();
		image.src = value;
		return image;
	},
	url: value => Object.assign(document.createElement('a'), {
		href: value,
		innerText: value,
		className: 'container__link'
	})
};

async function updateView(id, data, message = null) {
	let container = document.querySelector(`[data-id="${id}"]`);
	let containerContent = container.querySelector('.container__content');
	let containerMessage = container.querySelector('.container__message');

	if (!message) {
		for (let key in data) {
			let element = containerContent.querySelector(`[data-id="${id}-${key}"]`);
			if (element) {
				if (parsers.hasOwnProperty(key)) {
					let result = parsers[key](data[key]);
					if (result instanceof HTMLElement) {
						element.append(result);
					} else {
						element.innerText = result;
					}
				} else {
					element.innerText = data[key];
				}
			}
		}

		containerContent.classList.remove('hidden');
		containerMessage.classList.add('hidden');
	} else {
		containerMessage.innerText = message;

		containerContent.classList.add('hidden');
		containerMessage.classList.remove('hidden');
	}
}

async function searchAlliance(allianceId) {
	if (allianceId) {
		let allianceReponse = await fetch(`${baseUrl}/alliances/${allianceId}`);
		let allianceData = await allianceReponse.json();
		let allianceIconResponse = await fetch(`${baseUrl}/alliances/${allianceId}/icons`);
		let allianceIconData = await allianceIconResponse.json();

		let data = Object.assign({}, allianceData, { icon: allianceIconData[defaultImageKey] });

		updateView('alliance', data);
	} else {
		updateView('alliance', null, 'Без альянса');
	}
}

async function searchCorporation(corporationId) {
	let corporationReponse = await fetch(`${baseUrl}/corporations/${corporationId}`);
	let corporationData = await corporationReponse.json();
	let corporationIconResponse = await fetch(`${baseUrl}/corporations/${corporationId}/icons`);
	let corporationIconData = await corporationIconResponse.json();

	let data = Object.assign({}, corporationData, { icon: corporationIconData[defaultImageKey] });

	updateView('corporation', data);
	searchAlliance(corporationData.alliance_id);
}

async function searchUser(username) {
	let searchResponse = await fetch(`${baseUrl}/search/?categories=character&search=${encodeURIComponent(username)}&strict=true`);
	let searchData = await searchResponse.json();
	if (searchData.character) {
		let characterReponse = await fetch(`${baseUrl}/characters/${searchData.character[0]}`);
		let characterData = await characterReponse.json();
		let characterPortraitResponse = await fetch(`${baseUrl}/characters/${searchData.character[0]}/portrait`);
		let characterPortraitData = await characterPortraitResponse.json();

		let data = Object.assign({}, characterData, { portrait: characterPortraitData[defaultImageKey] });

		updateView('character', data);
		searchCorporation(characterData.corporation_id);

		location.hash = username;
	} else {
		updateView('character', null, `Персонаж ${username} не найден`);
		location.hash = '';
	}

	backdrop.innerText = '';
}

function bindHandlers() {
	let search = document.querySelector('[data-id="search"]');
	let searchInput = search.querySelector('.container__input');
	let searchButton = search.querySelector('.container__button');

	searchInput.addEventListener('keypress', event => {
		if (searchInput.value && event.which === 13) {
			resetView();
			searchUser(searchInput.value.trim());
			searchInput.value = '';
		}
	});

	searchButton.addEventListener('click', event => {
		if (searchInput.value) {
			resetView();
			searchUser(searchInput.value.trim());
			searchInput.value = '';
		}
	});

	let copyButtons = document.querySelectorAll('.container__copy');
	for (let button of copyButtons) {
		button.addEventListener('click', event => {
			let parent = event.currentTarget.parentNode;
			let target = parent.querySelector('.container__value');
			let text = target.innerText;

			if (text) {
				navigator.clipboard.writeText(text)
					.then(() => {
						notifier.innerText = 'Текст скопирован';

						notifier.classList.add('notifier--success');
						notifier.classList.remove('notifier--error');
						notifier.classList.add('notifier--visible');
					})
					.catch(() => {
						notifier.innerText = 'Не удалось скопировать';

						notifier.classList.remove('notifier--success');
						notifier.classList.add('notifier--error');
						notifier.classList.add('notifier--visible');
					});
			}
		});
	}

	let isEnd = false;
	notifier.addEventListener('animationend', event => {
		if (isEnd) {
			notifier.classList.remove('notifier--visible');
		}

		isEnd = !isEnd;
	});
}

function resetView() {
	let containers = document.querySelectorAll('.container');
	for (let container of containers) {
		let containerContent = container.querySelector('.container__content');
		let containerMessage = container.querySelector('.container__message');
		let fields = container.querySelectorAll('[data-id]');

		if (containerContent) {
			containerContent.classList.add('hidden');
		}
		if (containerMessage) {
			containerMessage.innerText = '';

			containerMessage.classList.add('hidden');
		}
		for (let field of fields) {
			field.innerText = '';
		}
	}
	backdrop.innerText = 'Загрузка данных';
}

function init() {
	bindHandlers();

	let username = decodeURIComponent(location.hash.slice(1));
	if (username) {
		resetView();
		searchUser(username);
	}
}

window.addEventListener('load', init);