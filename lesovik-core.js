/**
 * ============================================================================
 * ЛЕСОВИК-CORE (lesovik-core.js)
 * Центральное ядро экосистемы «Лесовик PRO»
 * Разработка и автоматизация для таксации и отвода лесосек
 * ============================================================================
 * Версия: 2.3 (Гибрид: Мгновенная блокировка РСЯ + Переключатель связки)
 * Автор / Владелец: Николай Сергеевич Худяков (ИП Худяков Н.С.)
 * Экосистема: РЕСУРС (https://resurs-stretch.ru/)
 * ============================================================================
 */

(function () {
    'use strict';

    // ------------------------------------------------------------------------
    // 1. ПРОВЕРКА ЛИЦЕНЗИИ И МГНОВЕННАЯ БЛОКИРОВКА РЕКЛАМЫ (ИЗ ОРИГИНАЛА)
    // ------------------------------------------------------------------------
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

    // МГНОВЕННЫЙ ПЕРЕХВАТ РСЯ ПРИ ЗАГРУЗКЕ СКРИПТА В HEAD
    const globalLicenseStatus = checkLicenseStatus();
    if (!globalLicenseStatus.isBlocked) {
        // 1. Заглушка очереди вызовов Яндекса
        window.yaContextCb = {
            push: function() { return 0; }
        };
        // 2. Инжекция CSS-подавления до рендера DOM
        const style = document.createElement('style');
        style.id = 'lesovik-pro-ad-blocker';
        style.innerHTML = `
            .yandex-rtb-feed-container, 
            div[id*="yandex_rtb"], 
            div[id*="ya_context"], 
            div[class*="floorAd"],
            .ya-share2,
            .rsya-block,
            .ad-container,
            iframe[src*="an.yandex.ru"] { 
                display: none !important; 
                height: 0 !important; 
                opacity: 0 !important; 
                pointer-events: none !important;
            }
        `;
        if (document.head) {
            document.head.appendChild(style);
        } else {
            document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
        }
    }

    // ------------------------------------------------------------------------
    // 2. КОНСТАНТЫ И НАСТРОЙКИ СИСТЕМЫ
    // ------------------------------------------------------------------------
    const STORAGE_KEYS = {
        PRO_LICENSE: 'lesovik_pro_license_key',
        ACTIVE_PROJECT_ID: 'lesovik_active_project_id',
        PROJECTS_DB: 'lesovik_projects_database',
        SYSTEM_MODE: 'lesovik_system_mode_enabled' // true - В связке, false - Автономно
    };

    const SYSTEM_MODULES = [
        { id: 'busol', name: 'Буссоль PRO', file: 'busol-pro.html', icon: '🧭' },
        { id: 'height', name: 'Высота', file: 'height.html', icon: '📏' },
        { id: 'diameter', name: 'Вилка', file: 'diameter.html', icon: '🌲' },
        { id: 'bitterlich', name: 'Полнотомер', file: 'bitterlich.html', icon: '👁️' },
        { id: 'journal', name: 'Перечет', file: 'journal.html', icon: '📋' },
        { id: 'mdo', name: 'МДО', file: 'mdo.html', icon: '📊' }
    ];

    // ------------------------------------------------------------------------
    // 3. ЕДИНЫЙ API LESOVIKCORE
    // ------------------------------------------------------------------------
    window.LesovikCore = {
        version: '2.3-PRO',

        isPro: function () {
            return !checkLicenseStatus().isBlocked;
        },

        isSystemMode: function () {
            if (!this.isPro()) return false;
            const savedMode = localStorage.getItem(STORAGE_KEYS.SYSTEM_MODE);
            return savedMode === null ? true : JSON.parse(savedMode);
        },

        setSystemMode: function (enabled) {
            if (!this.isPro()) {
                console.warn('Лесовик-Core: Доступно только в PRO версии.');
                return false;
            }
            localStorage.setItem(STORAGE_KEYS.SYSTEM_MODE, JSON.stringify(!!enabled));
            window.dispatchEvent(new CustomEvent('lesovik:mode_changed', { detail: { systemMode: !!enabled } }));
            location.reload();
        },

        getProjects: function () {
            try {
                const data = localStorage.getItem(STORAGE_KEYS.PROJECTS_DB);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.error('Ошибка чтения базы проектов:', e);
                return [];
            }
        },

        saveProjectsDB: function (projects) {
            try {
                localStorage.setItem(STORAGE_KEYS.PROJECTS_DB, JSON.stringify(projects));
                window.dispatchEvent(new CustomEvent('lesovik:db_updated'));
            } catch (e) {
                console.error('Ошибка сохранения базы проектов:', e);
            }
        },

        getActiveProjectId: function () {
            return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
        },

        setActiveProject: function (projectId) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, projectId);
            window.dispatchEvent(new CustomEvent('lesovik:project_changed', { detail: { projectId } }));
        },

        getActiveProject: function () {
            const projects = this.getProjects();
            const activeId = this.getActiveProjectId();
            if (!activeId && projects.length > 0) {
                this.setActiveProject(projects[0].id);
                return projects[0];
            }
            return projects.find(p => p.id === activeId) || null;
        },

        createProject: function (metaData) {
            const projects = this.getProjects();
            const newProject = {
                id: 'proj_' + Date.now(),
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                passport: {
                    lesnichestvo: metaData.lesnichestvo || 'Важгортское уч. лесничество',
                    kvartal: metaData.kvartal || '312',
                    delyanka: metaData.delyanka || '12',
                    target: metaData.target || 'Сплошная рубка',
                    year: metaData.year || '2026'
                },
                plots: metaData.plots || [
                    this.generateEmptyPlot('Выдел 6', 6.32),
                    this.generateEmptyPlot('Выдел 12', 4.50)
                ]
            };

            projects.unshift(newProject);
            this.saveProjectsDB(projects);
            this.setActiveProject(newProject.id);
            return newProject;
        },

        generateEmptyPlot: function (name, area) {
            return {
                id: 'plot_' + Math.random().toString(36).substr(2, 9),
                name: name || 'Выдел 1',
                area: area || 1.0,
                gis: { points: [], perimeter: 0, kmlData: null },
                speciesData: {}
            };
        },

        updatePlotModuleData: function (plotId, moduleKey, payload) {
            if (!this.isSystemMode()) return;

            const projects = this.getProjects();
            const activeId = this.getActiveProjectId();
            const projectIndex = projects.findIndex(p => p.id === activeId);
            if (projectIndex === -1) return;

            const plotIndex = projects[projectIndex].plots.findIndex(pl => pl.id === plotId);
            if (plotIndex === -1) return;

            const plot = projects[projectIndex].plots[plotIndex];
            plot.updated = new Date().toISOString();

            if (moduleKey === 'busol') {
                plot.gis = { ...plot.gis, ...payload };
                if (payload.area) plot.area = payload.area;
            } else if (['height', 'diameter', 'bitterlich', 'journal'].includes(moduleKey)) {
                if (!plot.speciesData) plot.speciesData = {};
                if (payload.speciesName) {
                    plot.speciesData[payload.speciesName] = {
                        ...(plot.speciesData[payload.speciesName] || {}),
                        ...payload.data
                    };
                }
            }

            projects[projectIndex].updated = new Date().toISOString();
            this.saveProjectsDB(projects);
        },

        // --------------------------------------------------------------------
        // 4. ОТРЕСОВКА ПРИЛИПАЮЩЕГО НИЖНЕГО МЕНЮ И ВЕРХНЕЙ ПАНЕЛИ
        // --------------------------------------------------------------------
        renderNavigationUI: function () {
            const currentFile = window.location.pathname.split('/').pop() || 'busol-pro.html';
            const isPro = this.isPro();
            const isSystemMode = this.isSystemMode();
            const activeProject = this.getActiveProject();

            // 1. Создаем или обновляем прилипающее НИЖНЕЕ МЕНЮ
            let bottomNav = document.getElementById('lesovik-bottom-nav-bar');
            if (!bottomNav) {
                bottomNav = document.createElement('div');
                bottomNav.id = 'lesovik-bottom-nav-bar';
                document.body.appendChild(bottomNav);
            }

            document.body.style.paddingBottom = '75px';

            bottomNav.style.cssText = `
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 60px;
                background: #1e252b;
                border-top: 2px solid #2e3b44;
                display: flex;
                justify-content: space-around;
                align-items: center;
                z-index: 99999;
                box-shadow: 0 -4px 15px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            `;

            bottomNav.innerHTML = SYSTEM_MODULES.map(m => {
                const isActive = currentFile.includes(m.file.replace('.html', ''));
                const linkHref = isPro ? `href="${m.file}"` : `href="javascript:void(0)" onclick="window.showProPromoModal()"`;
                return `
                    <a ${linkHref} style="
                        text-decoration: none;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        flex: 1;
                        height: 100%;
                        color: ${isActive ? '#8FBC8F' : '#b0bec5'};
                        font-size: 10px;
                        font-weight: ${isActive ? 'bold' : 'normal'};
                        background: ${isActive ? 'rgba(143, 188, 143, 0.1)' : 'transparent'};
                        border-top: 3px solid ${isActive ? '#8FBC8F' : 'transparent'};
                        transition: 0.2s;
                    ">
                        <span style="font-size: 18px; margin-bottom: 2px;">${m.icon}</span>
                        <span>${m.name}</span>
                    </a>
                `;
            }).join('');

            // 2. Встраиваем статус связки и выбор делянки в верхнюю шапку .glass-header
            const headerRight = document.querySelector('.glass-header .header-right');
            if (headerRight && !document.getElementById('lesovik-top-control-box')) {
                const controlBox = document.createElement('div');
                controlBox.id = 'lesovik-top-control-box';
                controlBox.style.cssText = 'display:flex; align-items:center; gap:8px; font-size:12px; margin-right:8px;';

                let html = '';
                if (isPro) {
                    html += `
                        <label style="display:inline-flex; align-items:center; cursor:pointer; background:rgba(45,90,39,0.15); padding:4px 8px; border-radius:6px; border:1px solid var(--forest-green); font-size:11px; color:#8FBC8F;">
                            <input type="checkbox" id="lesovik-mode-toggle" ${isSystemMode ? 'checked' : ''} style="margin-right:4px;">
                            <span>${isSystemMode ? '🔗 В связке' : '⚡ Автономно'}</span>
                        </label>
                    `;
                    if (isSystemMode && activeProject) {
                        html += `
                            <select id="lesovik-project-select" style="background:var(--card-bg); color:var(--text-graphite); border:1px solid var(--border-color); padding:4px; border-radius:6px; font-size:11px; max-width:130px;">
                                ${this.getProjects().map(p => `
                                    <option value="${p.id}" ${p.id === activeProject.id ? 'selected' : ''}>
                                        Кв.${p.passport.kvartal}, Д.${p.passport.delyanka}
                                    </option>
                                `).join('')}
                            </select>
                        `;
                    }
                }
                controlBox.innerHTML = html;
                headerRight.insertBefore(controlBox, headerRight.firstChild);

                const toggleBtn = document.getElementById('lesovik-mode-toggle');
                if (toggleBtn) {
                    toggleBtn.addEventListener('change', (e) => this.setSystemMode(e.target.checked));
                }
                const projectSelect = document.getElementById('lesovik-project-select');
                if (projectSelect) {
                    projectSelect.addEventListener('change', (e) => {
                        this.setActiveProject(e.target.value);
                        location.reload();
                    });
                }
            }
        },

        // --------------------------------------------------------------------
        // 5. ИНИЦИАЛИЗАЦИЯ
        // --------------------------------------------------------------------
        init: function () {
            if (this.getProjects().length === 0 && this.isPro()) {
                this.createProject({
                    lesnichestvo: 'Важгортское уч. лесничество',
                    kvartal: '312',
                    delyanka: '12'
                });
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.renderNavigationUI());
            } else {
                this.renderNavigationUI();
            }
        }
    };

    // МОДАЛЬНОЕ ОКНО ДЛЯ БЕСПЛАТНЫХ ПОЛЬЗОВАТЕЛЕЙ
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
                        Вы используете бесплатную автономную версию калькулятора. В версии <b>PRO</b> все 6 инструментов объединяются в единую сеть: чертеж делянки, площади и породы передаются между калькуляторами без рекламы.
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

    // Запуск ядра
    window.LesovikCore.init();

})();
