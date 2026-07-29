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
        let isBlocked = true; // По умолчанию заблокировано, если нет в списке

        if (licensedDevices.hasOwnProperty(currentId)) {
            const expDate = licensedDevices[currentId];
            if (now <= expDate.getTime()) {
                isBlocked = false; // Действительная лицензия
            }
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
                <h2 style="font-family:'Merriweather',serif; color:#8FBC8F; margin-bottom:10px;">Доступ ограничен (PRO)</h2>
                <p style="max-width:480px; font-size:13px; opacity:0.85; line-height:1.5; margin-bottom:20px;">
                    Модуль «Буссоль PRO» и офлайн-режим доступны только по лицензионному ключу.<br>
                    Ваш ID устройства: <b style="color:#8FBC8F; font-family:monospace; font-size:14px;">${currentId}</b>
                </p>
                <div style="background:rgba(255,255,255,0.04); padding:16px 20px; border-radius:10px; border:1px solid rgba(143,188,143,0.25); text-align:left; max-width:480px; width:100%; box-sizing:border-box; margin-bottom:20px;">
                    <span style="display:block; font-size:11px; opacity:0.6; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; text-align:center; font-weight:bold;">Для получения PRO-доступа:</span>
                    <div style="margin-bottom:12px; padding-bottom:10px; border-bottom:1px dashed rgba(255,255,255,0.1);">
                        <span style="display:block; font-size:12px; font-weight:bold; color:#8FBC8F;">• ООО «Сателлит»:</span>
                        <a href="mailto:a1983v@yandex.ru" style="color:#8FBC8F; font-weight:bold; text-decoration:none; font-size:13px; display:inline-block; margin-top:3px;">✉️ a1983v@yandex.ru</a>
                    </div>
                    <div>
                        <span style="display:block; font-size:12px; font-weight:bold; color:#8FBC8F;">• Разработка (ИП Худяков Н.С.):</span>
                        <a href="mailto:folgoal@gmail.com" style="color:#8FBC8F; font-weight:bold; text-decoration:none; font-size:13px; display:inline-block; margin-top:3px;">✉️ folgoal@gmail.com</a>
                    </div>
                </div>
                <a href="visotomer.html" style="color:#8FBC8F; text-decoration:underline; font-size:13px;">Вернуться к бесплатным калькуляторам</a>
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
                dendrometry: {},
                timestamp: new Date().toLocaleString('ru-RU')
            };
        },

        saveProject: function(updatedProject) {
            updatedProject.timestamp = new Date().toLocaleString('ru-RU');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProject));
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

    // --- 3. АВТОМАТИЧЕСКАЯ ВСТАВКА НИЖНЕЙ НАВИГАЦИИ ---
    function injectPWANavigation() {
        if (document.getElementById('pwa-nav-bar')) return;
        
        const currentPath = window.location.pathname.split('/').pop() || 'visotomer.html';

        const navHTML = `
            <div id="pwa-nav-bar" style="position:fixed; bottom:0; left:0; width:100%; background:#2C3531; display:flex; justify-content:space-around; align-items:center; padding:8px 0; z-index:9999; border-top:1px solid #8FBC8F; box-sizing:border-box; font-family:'Inter',sans-serif;">
                <a href="busol-pro.html" style="color:${currentPath.includes('busol') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('busol') ? 'bold' : 'normal'}; opacity:${currentPath.includes('busol') ? '1' : '0.75'};">🧭<br>Буссоль PRO</a>
                <a href="visotomer.html" style="color:${currentPath.includes('visotomer') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('visotomer') ? 'bold' : 'normal'}; opacity:${currentPath.includes('visotomer') ? '1' : '0.75'};">📐<br>Высота</a>
                <a href="bitterlich.html" style="color:${currentPath.includes('bitterlich') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('bitterlich') ? 'bold' : 'normal'}; opacity:${currentPath.includes('bitterlich') ? '1' : '0.75'};">🪵<br>Полнотомер</a>
                <a href="diameter.html" style="color:${currentPath.includes('diameter') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('diameter') ? 'bold' : 'normal'}; opacity:${currentPath.includes('diameter') ? '1' : '0.75'};">📏<br>Вилка</a>
                <a href="journal.html" style="color:${currentPath.includes('journal') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('journal') ? 'bold' : 'normal'}; opacity:${currentPath.includes('journal') ? '1' : '0.75'};">📋<br>Перечет</a>
                <a href="mdo.html" style="color:${currentPath.includes('mdo') ? '#8FBC8F' : '#FFF'}; text-decoration:none; font-size:10px; text-align:center; font-weight:${currentPath.includes('mdo') ? 'bold' : 'normal'}; opacity:${currentPath.includes('mdo') ? '1' : '0.75'};">💰<br>МДО</a>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', navHTML);
        document.body.style.paddingBottom = "60px";
    }

    // --- 4. ОТКЛЮЧЕНИЕ РЕКЛАМЫ ДЛЯ PRO ---
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
            window.yaContextCb = [];
        }
    }

    // --- 5. ИНИЦИАЛИЗАЦИЯ И РАЗДЕПЕНИЕ ЛОГИКИ ОНЛАЙН / PRO ---
    function initCore() {
        const license = checkLicenseStatus();
        const currentPath = window.location.pathname.split('/').pop() || '';
        
        // Проверяем, запущены ли мы в офлайн-приложении (Cordova или установлен PWA)
        const isStandaloneApp = window.matchMedia('(display-mode: standalone)').matches || window.cordova || window.device;

        // Блокируем экран ТОЛЬКО если:
        // 1. Пользователь зашел на страницу busol-pro.html без лицензии
        // 2. ИЛИ пользователь пытается использовать установленное PWA/APK приложение без лицензии
        if (license.isBlocked && (currentPath.includes('busol-pro') || isStandaloneApp)) {
            renderLicenseBlock(license.currentId);
            return;
        }

        disableAdsIfPRO();
        injectPWANavigation();

        const project = window.LesovikCore.getProject();

        // Синхронизация полей
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

    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            window.dispatchEvent(new Event('lesovikDataChanged'));
        }
    });

    document.addEventListener('deviceready', initCore, false);
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (!window.device) initCore();
        }, 300);
    }, false);

})();
