/* ========================================================================
   «ЛЕСОВИК-ПРО» (c) 2026 ИП Худяков Николай Сергеевич. Все права защищены.
   Свидетельство ИНН: 11180157622.
   Единый модуль контекста, защиты, блокировки РСЯ и навигации (lesovik-core.js)
   ======================================================================== */

(function() {
    'use strict';

    const STORAGE_KEY = 'lesovik_active_project';

    // --- 1. СПИСОК ЛИЦЕНЗИРОВАННЫХ УСТРОЙСТВ И ПРОВЕРКА КЛЮЧЕЙ ---
    const licensedDevices = {
        "HNS-RAL2-45TCN0": new Date(2099, 11, 31),  // Бессрочно (iPhone Яндекс)
        "HNS-DDFW-V15MN9": new Date(2099, 11, 31),  // Бессрочно (iPhone Safari)
        "HNS-3SBX-TQMJO7": new Date(2026, 11, 31),  // До 31 декабря 2026 (Ноутбук)
        "HNS-MINCIFRA-TEST": new Date(2099, 11, 31),// Доступ экспертов Минцифры
    };

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
        let isBlocked = true;

        if (licensedDevices.hasOwnProperty(currentId)) {
            const expDate = licensedDevices[currentId];
            if (now <= expDate.getTime()) {
                isBlocked = false; // Действительная лицензия
            }
        }

        return { isBlocked, currentId };
    }

    // МГНОВЕННАЯ БЛОКИРОВКА РЕКЛАМЫ РСЯ ДЛЯ PRO-КЛЮЧЕЙ (ВЫЗЫВАЕТСЯ СРАЗУ В HEAD)
    const licenseStatus = checkLicenseStatus();
    if (!licenseStatus.isBlocked) {
        // Заглушка очереди вызовов Яндекса для мгновенного подавления
        window.yaContextCb = {
            push: function() { return 0; }
        };
        // Подавление CSS-контейнеров рекламы
        const style = document.createElement('style');
        style.innerHTML = `
            .yandex-rtb-feed-container, 
            div[id*="yandex_rtb"], 
            div[id*="ya_context"], 
            div[class*="floorAd"] { 
                display: none !important; 
                height: 0 !important; 
                opacity: 0 !important; 
            }
        `;
        if (document.head) {
            document.head.appendChild(style);
        } else {
            document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
        }
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
                dendrometry: {},
                timestamp: new Date().toLocaleString('ru-RU')
            };
        },

        saveProject: function(updatedProject) {
            // Синхронизация работает только на PRO версиях
            if (!checkLicenseStatus().isBlocked) {
                updatedProject.timestamp = new Date().toLocaleString('ru-RU');
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProject));
                window.dispatchEvent(new Event('lesovikDataChanged'));
            }
        },

        resetProject: function() {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
        },

        isPRO: function() {
            return !checkLicenseStatus().isBlocked;
        }
    };

    // --- 3. ПОЛНОЭКРАННАЯ БЛОКИРОВКА БУССОЛИ PRO ДЛЯ БЕСПЛАТНЫХ ПОЛЬЗОВАТЕЛЕЙ ---
    function renderLicenseBlock(currentId) {
        document.body.innerHTML = `
            <div style="position:fixed; top:0; left:0; width:100vw; height:100vh; 
                        background:#111815; color:#F9FBF9; z-index:99999; 
                        display:flex; flex-direction:column; align-items:center; 
                        justify-content:center; font-family:'Inter',sans-serif; padding:20px; text-align:center; box-sizing:border-box;">
                <span style="font-size:50px; margin-bottom:15px;">🔒</span>
                <h2 style="font-family:'Merriweather',serif; color:#8FBC8F; margin-bottom:10px;">Доступ ограничен (PRO)</h2>
                <p style="max-width:480px; font-size:13px; opacity:0.85; line-height:1.5; margin-bottom:20px;">
                    Модуль «Буссоль PRO» и автономный офлайн-комплекс работают по лицензионному ключу.<br>
                    Ваш ID устройства: <b style="color:#8FBC8F; font-family:monospace; font-size:14px;">${currentId}</b>
                </p>
                <div style="background:rgba(255,255,255,0.04); padding:16px 20px; border-radius:10px; border:1px solid rgba(143,188,143,0.25); text-align:left; max-width:480px; width:100%; box-sizing:border-box; margin-bottom:20px;">
                    <span style="display:block; font-size:11px; opacity:0.6; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; text-align:center; font-weight:bold;">Для получения PRO-доступа:</span>
                    <div style="margin-bottom:12px; padding-bottom:10px; border-bottom:1px dashed rgba(255,255,255,0.1);">
                        <span style="display:block; font-size:12px; font-weight:bold; color:#8FBC8F;">• Официальный дистрибьютор (ООО «Сателлит»):</span>
                        <a href="mailto:a1983v@yandex.ru" style="color:#8FBC8F; font-weight:bold; text-decoration:none; font-size:13px; display:inline-block; margin-top:3px;">✉️ a1983v@yandex.ru</a>
                    </div>
                    <div>
                        <span style="display:block; font-size:12px; font-weight:bold; color:#8FBC8F;">• Отдел разработки ПО (ИП Худяков Н.С.):</span>
                        <a href="mailto:folgoal@gmail.com" style="color:#8FBC8F; font-weight:bold; text-decoration:none; font-size:13px; display:inline-block; margin-top:3px;">✉️ folgoal@gmail.com</a>
                    </div>
                </div>
                <a href="visotomer.html" style="color:#8FBC8F; text-decoration:underline; font-size:13px;">Вернуться к бесплатным калькуляторам</a>
            </div>
        `;
    }

    // --- 4. МОДАЛЬНОЕ ОКНО ПРЕДЛОЖЕНИЯ КУПИТЬ PRO ПРИ КЛИКЕ В МЕНЮ ---
    window.showProPromoModal = function() {
        if (document.getElementById('pro-promo-modal')) {
            document.getElementById('pro-promo-modal').style.display = 'flex';
            return;
        }

        const currentId = getCurrentDeviceId();
        const modalHTML = `
            <div id="pro-promo-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.75); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box; font-family:'Inter',sans-serif;">
                <div style="background:#111815; color:#F9FBF9; border:1px solid #8FBC8F; border-radius:12px; max-width:500px; width:100%; padding:20px; position:relative; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                    <button onclick="document.getElementById('pro-promo-modal').style.display='none'" style="position:absolute; top:12px; right:12px; background:transparent; border:none; color:#FFF; font-size:22px; cursor:pointer;">&times;</button>
                    <div style="text-align:center; margin-bottom:15px;">
                        <span style="font-size:40px;">🌲</span>
                        <h3 style="font-family:'Merriweather',serif; color:#8FBC8F; margin:8px 0 5px 0;">Единая экосистема «Лесовик PRO»</h3>
                        <span style="font-size:11px; opacity:0.7; text-transform:uppercase;">Сквозной контекст • Бесшовная связка 6 инструментов</span>
                    </div>
                    <p style="font-size:12px; line-height:1.5; opacity:0.9; margin-bottom:15px; text-align:justify;">
                        Вы используете бесплатную автономную версию калькулятора. В версии <b>PRO</b> все 6 инструментов (Буссоль, Высотомер, Полнотомер, Мерная вилка, Перечетная ведомость и МДО) автоматически объединяются в единую сеть: чертеж делянки, площади и породы передаются между калькуляторами без рекламы.
                    </p>
                    <div style="background:rgba(255,255,255,0.04); padding:12px 15px; border-radius:8px; border:1px solid rgba(143,188,143,0.25); font-size:12px; margin-bottom:15px;">
                        <span style="display:block; font-size:10px; opacity:0.6; text-transform:uppercase; margin-bottom:6px; font-weight:bold;">Ваш ID устройства: <b style="color:#8FBC8F; font-family:monospace;">${currentId}</b></span>
                        <div style="margin-bottom:8px;">
                            <span style="font-weight:bold; color:#8FBC8F;">• ООО «Сателлит» (Отдел продаж):</span><br>
                            <a href="mailto:a1983v@yandex.ru" style="color:#8FBC8F; font-weight:bold; text-decoration:none;">✉️ a1983v@yandex.ru</a>
                        </div>
                        <div>
                            <span style="font-weight:bold; color:#8FBC8F;">• ИП Худяков Н.С. (Разработка):</span><br>
                            <a href="mailto:folgoal@gmail.com" style="color:#8FBC8F; font-weight:bold; text-decoration:none;">✉️ folgoal@gmail.com</a>
                        </div>
                    </div>
                    <button onclick="document.getElementById('pro-promo-modal').style.display='none'" style="width:100%; padding:10px; background:#2D5A27; color:#FFF; border:none; border-radius:6px; font-weight:bold; cursor:pointer; text-transform:uppercase; font-size:12px;">Понятно, продолжить в бесплатном режиме</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    // --- 5. АВТОМАТИЧЕСКАЯ ВСТАВКА НИЖНЕЙ НАВИГАЦИИ ---
    function injectPWANavigation() {
        if (document.getElementById('pwa-nav-bar')) return;
        
        const currentPath = window.location.pathname.split('/').pop() || 'visotomer.html';
        const isPRO = window.LesovikCore.isPRO();

        function getLink(targetPath) {
            // Если пользователь на PRO — ссылки работают штатно. 
            // Если на бесплатном — клик вызывает модалку покупки PRO (кроме текущей страницы).
            if (isPRO || currentPath.includes(targetPath.replace('.html', ''))) {
                return `href="${targetPath}"`;
            } else {
                return `href="javascript:void(0)" onclick="window.showProPromoModal()"`;
            }
        }

        const navHTML = `
            <div id="pwa-nav-bar" style="position:fixed; bottom:0; left:0; width:100%; background:#2C3531; display:flex; justify-content:space-around; align-items:center; padding:8px 0; z-index:9999; border-top:1px solid #8FBC8F; box-sizing:border-box; font-family:'Inter',sans-serif;">
                <a ${getLink('busol-pro.html')} style="color:${currentPath.includes('busol') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('busol') ? 'bold' : 'normal'}; opacity:${currentPath.includes('busol') ? '1' : '0.75'};">🧭<br>Буссоль PRO</a>
                <a ${getLink('visotomer.html')} style="color:${currentPath.includes('visotomer') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('visotomer') ? 'bold' : 'normal'}; opacity:${currentPath.includes('visotomer') ? '1' : '0.75'};">📐<br>Высота</a>
                <a ${getLink('bitterlich.html')} style="color:${currentPath.includes('bitterlich') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('bitterlich') ? 'bold' : 'normal'}; opacity:${currentPath.includes('bitterlich') ? '1' : '0.75'};">🪵<br>Полнотомер</a>
                <a ${getLink('diameter.html')} style="color:${currentPath.includes('diameter') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('diameter') ? 'bold' : 'normal'}; opacity:${currentPath.includes('diameter') ? '1' : '0.75'};">📏<br>Вилка</a>
                <a ${getLink('journal.html')} style="color:${currentPath.includes('journal') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('journal') ? 'bold' : 'normal'}; opacity:${currentPath.includes('journal') ? '1' : '0.75'};">📋<br>Перечет</a>
                <a ${getLink('mdo.html')} style="color:${currentPath.includes('mdo') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('mdo') ? 'bold' : 'normal'}; opacity:${currentPath.includes('mdo') ? '1' : '0.75'};">💰<br>МДО</a>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', navHTML);
        document.body.style.paddingBottom = "60px";
    }

    // --- 6. ИНИЦИАЛИЗАЦИЯ И СВЯЗЫВАНИЕ UI ПОЛЕЙ ---
    function initCore() {
        const license = checkLicenseStatus();
        const currentPath = window.location.pathname.split('/').pop() || '';
        const isStandaloneApp = window.matchMedia('(display-mode: standalone)').matches || window.cordova || window.device;

        // Блокируем Буссоль PRO или автономное PWA/APK приложение для нелицензированных устройств
        if (license.isBlocked && (currentPath.includes('busol-pro') || isStandaloneApp)) {
            renderLicenseBlock(license.currentId);
            return;
        }

        injectPWANavigation();

        // Синхронизация полей активного проекта работает только на PRO
        if (!license.isBlocked) {
            const project = window.LesovikCore.getProject();

            const nameInputs = document.querySelectorAll('#project-name, #tally-name, input[name="project_name"]');
            nameInputs.forEach(input => {
                if (project.name && !input.value) input.value = project.name;
                input.addEventListener('input', (e) => {
                    const proj = window.LesovikCore.getProject();
                    proj.name = e.target.value;
                    window.LesovikCore.saveProject(proj);
                });
            });

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
        }
    }

    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            window.dispatchEvent(new Event('lesovikDataChanged'));
        }
    });

    document.addEventListener('deviceready', initCore, false);
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (!window.device) initCore();
        }, 100);
    }, false);

})();
