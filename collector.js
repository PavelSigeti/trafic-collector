const getGAClientID = () => {
    return new Promise((resolve, reject) => {
        if (typeof gtag !== 'undefined') {
            gtag('get', 'GA_MEASUREMENT_ID', 'client_id', (clientID) => {
                resolve(clientID);
            });
        } else {
            resolve(null);
        }
    });
}

const getYandexMetrikaID = () => {
    return new Promise((resolve, reject) => {
        try {
            const ymID = 'YANDEX_METRIKA_ID'; // Замените на свой ID
            if (window['yaCounter' + ymID]) {
                resolve(window['yaCounter' + ymID].getClientID());
            } else {
                resolve(null);
            }
        } catch (e) {
            resolve(null);
        }
    });
}
const getUserIP = async () => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Ошибка получения IP-адреса:', error);
    }
    return null;
}

const trackPageVisibility = (data) => {
    document.addEventListener('visibilitychange', () => {
        data.visibility = document.visibilityState;
        data.interactions.push({
            type: 'visibilityChange',
            visibility: document.visibilityState,
            timestamp: Date.now()
        });
    });
}

const collectUserData = async () => {
    const data = {
        gaClientID: await getGAClientID(),
        yandexClientID: await getYandexMetrikaID(),
        userAgent: navigator.userAgent,
        language: navigator.languages,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateTime: Date.now(),
        referrer: document.referrer,
        pageURL: window.location.href,
        country: await getUserCountry(),
        ip: await getUserIP(),
        localStorageAvailable: typeof localStorage !== 'undefined',
        cookieEnabled: navigator.cookieEnabled,
        interactions: []
    };

    return data;
}

const trackUserInteractions = (data) => {
    document.addEventListener('click', (event) => {
        data.interactions.push({
            type: 'click',
            x: event.clientX,
            y: event.clientY,
            timestamp: Date.now()
        });
    });

    document.addEventListener('scroll', () => {
        data.interactions.push({
            type: 'scroll',
            scrollTop: window.scrollY,
            timestamp: Date.now()
        });
    });

    document.addEventListener('mousemove', (event) => {
        data.interactions.push({
            type: 'mousemove',
            x: event.clientX,
            y: event.clientY,
            timestamp: Date.now()
        });
    });

    trackPageVisibility(data);
}

const sendDataToServer = (data) => {
    fetch('/api/track-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            console.error('Ошибка отправки данных:', response.statusText);
        }
    })
    .catch(error => {
        console.error('Ошибка сети:', error);
    });
}


const initUserTracking = async () => {
    const data = await collectUserData();
    trackUserInteractions(data);

    // TODO: Оптимизировать при выполнении каких либо действий. При бездействии сделать, чтобы просто раз в 30 сек отправляло бездействие
    setInterval(() => {
        sendDataToServer(data);
        data.interactions = []; 
    }, 30000);
}

document.addEventListener('DOMContentLoaded', initUserTracking);