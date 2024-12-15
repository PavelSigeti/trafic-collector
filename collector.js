const getYandexMetrikaID = () => {
    return new Promise((resolve, reject) => {
        const ymID = '79358491';
        const checkCounter = () => {
            try {
                const counter = window['yaCounter' + ymID];
                if (counter && typeof counter.getClientID === 'function') {
                    resolve(counter.getClientID());
                } else if (!counter) {
                    setTimeout(checkCounter, 100);
                } else {
                    resolve(null);
                }
            } catch (e) {
                reject(e);
            }
        };
        checkCounter();
    });
};

const collectUserData = async () => {
    const data = {
        yandexClientID: await getYandexMetrikaID(),
        userAgent: navigator.userAgent,
        language: navigator.languages,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        dateTime: Date.now(),
        referrer: document.referrer,
        pageURL: window.location.href,
        localStorageAvailable: typeof localStorage !== 'undefined',
        cookieEnabled: navigator.cookieEnabled,
        loadTime: getPageLoadTime(),
        interactions: [],
    };
    return data;
};

const sendDataToServer = (data) => {
    fetch('http://localhost:1750/api/track-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then((response) => {
            if (!response.ok) {
                console.error('Ошибка отправки данных:', response.statusText);
            }
        })
        .catch((error) => {
            console.error('Ошибка сети:', error);
        });
};

const trackUserInteractions = (data) => {
    let scrollTimeout, mouseMoveTimeout, idleTimeout;

    const flushInteractions = () => {
        if (data.interactions.length > 0) {
            sendDataToServer({ ...data, interactions: [...data.interactions] });
            data.interactions = []; 
        }
    };

    const resetIdleTimer = () => {
        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
            flushInteractions();
        }, 15000); 
    };

    const registerInteraction = (interaction) => {
        data.interactions.push(interaction);
        resetIdleTimer();
    };

    document.addEventListener('click', (event) => {
        registerInteraction({
            type: 'click',
            x: event.clientX,
            y: event.clientY,
            timestamp: Date.now(),
        });
        flushInteractions(); 
    });

    document.addEventListener('scroll', () => {
        registerInteraction({
            type: 'scroll',
            scrollTop: window.scrollY,
            timestamp: Date.now(),
        });
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            flushInteractions(); 
        }, 1000);
    });

    let isFirstMove = true;
    let lastMouseEvent = null;
    let throttleTimeout = null;

    const handleMouseMove = (event) => {
        if (isFirstMove) {
            sendMouseMoveData(event);
            isFirstMove = false;
        } else {
            lastMouseEvent = event;

            if (!throttleTimeout) {
                throttleTimeout = setTimeout(() => {
                    if (lastMouseEvent) {
                        sendMouseMoveData(lastMouseEvent);
                        lastMouseEvent = null;
                    }
                    throttleTimeout = null;
                }, 300);
            }
        }
    };

    const sendMouseMoveData = (event) => {
        const interaction = {
            type: 'mousemove',
            x: event.clientX,
            y: event.clientY,
            timestamp: Date.now(),
        };

        data.interactions.push(interaction);

        resetIdleTimer();
        flushInteractions();
    };

    document.addEventListener('mousemove', handleMouseMove);

    document.addEventListener('visibilitychange', () => {
        registerInteraction({
            type: 'visibilityChange',
            visibility: document.visibilityState,
            timestamp: Date.now(),
        });
        flushInteractions(); 
    });

    resetIdleTimer();
};

const initUserTracking = async () => {
    const data = await collectUserData();

    sendDataToServer(data);
    trackUserInteractions(data);
};

document.addEventListener('DOMContentLoaded', initUserTracking);

function getPageLoadTime() {
    if (performance.timing) {
        return performance.timing.loadEventEnd - performance.timing.navigationStart;
    }
    return null;
}
