/* ========================================================================
   «ЛЕСОВИК-ПРО» (c) 2026 ИП Худяков Николай Сергеевич. Все права защищены.
   Свидетельство ИНН: 11180157622.
   Единый модуль контекста, защиты и навигации (lesovik-core.js)
   ======================================================================== */

(function() {
    'use strict';

    const STORAGE_KEY = 'lesovik_active_project';

    // --- 1. СПИСОК ЛИЦЕНЗИРОВАННЫХ УСТРОЙСТВ И ПРОВЕРКА КЛЮЧЕЙ ---
    const licensedDevices = {
        "HNS-6680-TVK32U": new Date(2026, 6, 30),   // До 30 июля 2026
        "HNS-RAL2-45TCN0": new Date(2099, 11, 31),  // Бессрочно (iPhone Яндекс)
        "HNS-DDFW-V15MN9": new Date(2099, 11, 31),  // Бессрочно (iPhone Safari)
        "HNS-3SBX-TQMJO7": new Date(2026, 11, 31),  // До 31 декабря 2026 (Ноутбук)
        "HNS-5V40-G89K6X": new Date(2026, 6, 25),   // Андрей Сателлит
        "HNS-6BS0-ZIHISC": new Date(2026, 6, 25),   // Паша брат
        "HNS-MINCIFRA-TEST": new Date(2099, 11, 31),// Доступ экспертов Минцифры
        "HNS-3T7D-ZJKISD": new Date(2026, 6, 30),   // Андрей Красноярск Huawei
        "HNS-77Z8-CZ5KA9": new Date(2026, 11, 31),  // Андрей Красноярск Huawei
        "HNS-3K0F-5IHF3A": new Date(2099, 11, 31),  // Телефон Android
        "HNS-SZ5W-35QREE": new Date(2026, 8, 28)   // Вячеслав (оплата 2000)
    };

    // Общая дата окончания бесплатного периода для остальных пользователей (21 июля 2026)
    const defaultLicenseExpirationDate = new Date(2026, 6, 21);

    function generateWebDeviceId() {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let segment1 = '', segment2 = '';
        for (let i = 0; i < 4; i++) segment1 += chars.charAt(Math.floor(Math.random() * chars.length));
        for (let i = 0; i < 6; i++) segment2 += chars.charAt(Math.floor(Math.random() * chars.length));
        return `HNS-${segment1}-${segment2}`;
    }

    function getCurrentDeviceId() {
        if (window.device && window.device.uuid) {
            return window.device.uuid;
        }
        
        // Перехват ключа из URL (для тестов и Минцифры)
        const urlParams = new URLSearchParams(window.location.search);
        const keyParam = urlParams.get('key');
        if (keyParam) {
            localStorage.setItem('bg_hns_web_id', keyParam);
            return keyParam;
        }

        let webId = localStorage.getItem('bg_hns_web_id');
        if (!webId) {
            webId = generateWebDeviceId();
            localStorage.setItem('bg_hns_web_id', webId);
        }
        return webId;
    }

    function checkLicenseStatus() {
        const currentId = getCurrentDeviceId();
        const now = Date.now();
        let isBlocked = false;

        if (licensedDevices.hasOwnProperty(currentId)) {
            const expDate = licensedDevices[currentId];
            if (now > expDate.getTime()) isBlocked = true;
        } else {
            if (now > defaultLicenseExpirationDate.getTime()) isBlocked = true;
        }

        return { isBlocked, currentId };
    }

    function renderLicenseBlock(currentId) {
        document.body.innerHTML = `
            <div style="position:fixed; top:0; left:0; width:100vw; height:100vh; 
                        background:#111815; color:#F9FBF9; z-index:99999; 
                        display:flex; flex-direction:column; align-items:center; 
                        justify-content:center; font-family:'Inter',sans-serif; padding:20px; text-align:center; box-sizing:border-box;">
                <span style="font-size:50px; margin-bottom:15px;">🔒</span>
                <h2 style="font-family:'Merriweather',serif; color:#8FBC8F; margin-bottom:10px;">Срок действия ПО истек</h2>
                <p style="max-width:480px; font-size:13px; opacity:0.85; line-height:1.5; margin-bottom:20px;">
                    Период демонстрационной или оплаченной установки данной копии комплекса «Лесовик PRO» завершен.<br>
                    Ваш ID устройства: <b style="color:#8FBC8F; font-family:monospace; font-size:14px;">${currentId}</b>
                </p>
                <div style="background:rgba(255,255,255,0.04); padding:16px 20px; border-radius:10px; border:1px solid rgba(143,188,143,0.25); text-align:left; max-width:480px; width:100%; box-sizing:border-box;">
                    <span style="display:block; font-size:11px; opacity:0.6; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; text-align:center; font-weight:bold;">Для продления лицензии и приобретения ключей:</span>
                    <div style="margin-bottom:12px; padding-bottom:10px; border-bottom:1px dashed rgba(255,255,255,0.1);">
                        <span style="display:block; font-size:12px; font-weight:bold; color:#8FBC8F;">• Официальный дистрибьютор (ООО «Сателлит»):</span>
                        <a href="mailto:a1983v@yandex.ru" style="color:#8FBC8F; font-weight:bold; text-decoration:none; font-size:13px; display:inline-block; margin-top:3px;">✉️ a1983v@yandex.ru</a>
                    </div>
                    <div>
                        <span style="display:block; font-size:12px; font-weight:bold; color:#8FBC8F;">• Отдел разработки ПО (ИП Худяков Н.С.):</span>
                        <a href="mailto:folgoal@gmail.com" style="color:#8FBC8F; font-weight:bold; text-decoration:none; font-size:13px; display:inline-block; margin-top:3px;">✉️ folgoal@gmail.com</a>
                    </div>
                </div>
            </div>
        `;
    }

    // --- 2. ЕДИНЫЙ API СИНХРОНИЗАЦИИ КОНТЕКСТА ДЕЛЯНКИ ---
    window.LesovikCore = {
        getProject: function() {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {
                id: Date.now(),
                name: '',
                coordinates: null,
                totalAreaHa: 1.0,
                explAreaHa: 1.0,
                dendrometry: {}, // Высоты, диаметры, породы
                timestamp: new Date().toLocaleString('ru-RU')
            };
        },

        saveProject: function(updatedProject) {
            updatedProject.timestamp = new Date().toLocaleString('ru-RU');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProject));
            // Генерируем событие для мгновенного обновления во всех соседних вкладках
            window.dispatchEvent(new Event('lesovikDataChanged'));
        },

        resetProject: function() {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
        },

        isPRO: function() {
            const status = checkLicenseStatus();
            return !status.isBlocked;
        }
    };

    // --- 3. АВТОМАТИЧЕСКАЯ ВСТАВКА НИЖНЕЙ НАВИГАЦИИ (PWA BOTTOM BAR) ---
    function injectPWANavigation() {
        if (document.getElementById('pwa-nav-bar')) return;
        
        // Определяем текущий открытый файл, чтобы подсветить иконку
        const currentPath = window.location.pathname.split('/').pop() || 'busol-pro.html';

        const navHTML = `
            <div id="pwa-nav-bar" style="position:fixed; bottom:0; left:0; width:100%; background:#2C3531; display:flex; justify-content:space-around; align-items:center; padding:8px 0; z-index:9999; border-top:1px solid #8FBC8F; box-sizing:border-box; font-family:'Inter',sans-serif;">
                <a href="busol-pro.html" style="color:${currentPath.includes('busol') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('busol') ? 'bold' : 'normal'}; opacity:${currentPath.includes('busol') ? '1' : '0.75'};">🧭<br>Буссоль</a>
                <a href="visotomer.html" style="color:${currentPath.includes('visotomer') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('visotomer') ? 'bold' : 'normal'}; opacity:${currentPath.includes('visotomer') ? '1' : '0.75'};">📐<br>Высота</a>
                <a href="diameter.html" style="color:${currentPath.includes('diameter') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('diameter') ? 'bold' : 'normal'}; opacity:${currentPath.includes('diameter') ? '1' : '0.75'};">📏<br>Вилка</a>
                <a href="journal.html" style="color:${currentPath.includes('journal') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('journal') ? 'bold' : 'normal'}; opacity:${currentPath.includes('journal') ? '1' : '0.75'};">📋<br>Перечет</a>
                <a href="mdo.html" style="color:${currentPath.includes('mdo') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('mdo') ? 'bold' : 'normal'}; opacity:${currentPath.includes('mdo') ? '1' : '0.75'};">💰<br>МДО</a>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', navHTML);
        document.body.style.paddingBottom = "60px"; // Защита от перекрытия нижнего контента
    }

    // --- 4. РЕЖИМ ОТКЛЮЧЕНИЯ РСЯ (РЕКЛАМЫ) В PRO ВЕРСИИ ---
    function disableAdsIfPRO() {
        if (window.LesovikCore.isPRO()) {
            const style = document.createElement('style');
            style.innerHTML = `
                .yandex-rtb-feed-container, 
                div[id*="yandex_rtb"], 
                div[id*="ya_context"] { 
                    display: none !important; 
                }
            `;
            document.head.appendChild(style);
            window.yaContextCb = []; // Блокируем очередь выполнения скриптов РСЯ
        }
    }

    // --- 5. АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ И СВЯЗЫВАНИЕ UI ПОЛЕЙ ---
    function initCore() {
        const license = checkLicenseStatus();
        
        // Если лицензия истекла — сразу показываем блокировку и останавливаем работу
        if (license.isBlocked) {
            renderLicenseBlock(license.currentId);
            return;
        }

        disableAdsIfPRO();
        injectPWANavigation();

        const project = window.LesovikCore.getProject();

        // 5.1. Автозаполнение названия делянки
        const nameInputs = document.querySelectorAll('#project-name, #tally-name, input[name="project_name"]');
        nameInputs.forEach(input => {
            if (project.name && !input.value) {
                input.value = project.name;
            }
            input.addEventListener('input', (e) => {
                const proj = window.LesovikCore.getProject();
                proj.name = e.target.value;
                window.LesovikCore.saveProject(proj);
            });
        });

        // 5.2. Автозаполнение площадей выдела (Буссоль -> Перечетка / МДО)
        const explAreaInputs = document.querySelectorAll('#area-ha-expl, #mdo-space, #strip-area-expl, #circ-area-expl');
        explAreaInputs.forEach(input => {
            if (project.explAreaHa && (input.value == "1.0" || input.value == "50.0" || !input.value)) {
                input.value = project.explAreaHa;
                input.dispatchEvent(new Event('change'));
                input.dispatchEvent(new Event('input'));
            }
            input.addEventListener('change', (e) => {
                const proj = window.LesovikCore.getProject();
                proj.explAreaHa = parseFloat(e.target.value) || 1.0;
                window.LesovikCore.saveProject(proj);
            });
        });

        // 5.3. Отображение единого статуса GPS
        const geoDisplay = document.getElementById('geo-coordinates');
        if (geoDisplay && project.coordinates) {
            const c = project.coordinates;
            if (c.dmsLat && c.dmsLon) {
                geoDisplay.innerText = `📍 ${c.dmsLat} ${c.dmsLon} (${c.lat}, ${c.lon})`;
            } else if (c.lat && c.lon) {
                geoDisplay.innerText = `Широта: ${c.lat}, Долгота: ${c.lon}`;
            }
        }
    }

    // Слушаем изменения в других вкладках для синхронизации
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            window.dispatchEvent(new Event('lesovikDataChanged'));
        }
    });

    // Запуск при готовности приложения (Cordova или обычный Браузер)
    document.addEventListener('deviceready', initCore, false);
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (!window.device) initCore();
        }, 300);
    }, false);

})();
