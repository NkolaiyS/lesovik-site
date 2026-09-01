/**
 * ============================================================================
 * ЛЕСОВИК-CORE (lesovik-core.js)
 * Центральное ядро экосистемы «Лесовик PRO»
 * ============================================================================
 * Версия: 3.2.1 (Стабильный офлайн, Self-healing, Защита черновиков и Paywall)
 * Автор / Владелец: Николай Сергеевич Худяков (ИП Худяков Н.С.)
 * Экосистема: РЕСУРС (https://resurs-stretch.ru/)
 * ============================================================================
 */

(function () {
    'use strict';

    // 1. РЕЕСТР АКТИВИРОВАННЫХ УСТРОЙСТВ И СРОКИ ДЕЙСТВИЯ ЛИЦЕНЗИЙ
    // Месяцы в JS: 0-Янв, 1-Фев, 2-Мар, 3-Апр, 4-Май, 5-Июн, 6-Июл, 7-Авг, 8-Сен, 9-Окт, 10-Ноя, 11-Дек
    const licensedDevices = {
        "HNS-I6UX-FQXE0J": new Date(2099, 11, 31), // Бессрочно (iPhone Яндекс Николай)
        "HNS-BDSE-8ZMQTS": new Date(2099, 11, 31), // Бессрочно (iPhone Safari Николай)
        "HNS-0EEC-NJR6JS": new Date(2099, 11, 31), // Бессрочно (Web Николай)
        "HNS-JG2X-7UH949": new Date(2099, 11, 31), // Бессрочно (Web Николай) Гугл
        "HNS-3K0F-5IHF3A": new Date(2099, 11, 31), // Бессрочно (Android Николай)
        "HNS-3SBX-TQMJO7": new Date(2026, 11, 31), // До 31 декабря 2026 (Ноутбук)
        "HNS-MINCIFRA-TEST": new Date(2099, 11, 31), // Доступ экспертов Минцифры
        "HNS-HS86-KK7HRA": new Date(2099, 11, 31),  // Андрей (Редми)
        "HNS-RFS7-RYJB5K": new Date(2099, 11, 31), // Андрей (Хуавей)
        "HNS-4L1E-25O9U6": new Date(2026, 7, 31),   // Хонор 7 до 31 августа 2026
        "HNS-YU2O-2MRLAE": new Date(2099, 11, 31), // Бессрочно (Android Павел брат)
        "HNS-NATS-GINXIF": new Date(2026, 8, 5),   // Вячеслав на 14 дней до 5 сентября Минусинск ссылка
        "HNS-6UEP-ZF011I": new Date(2026, 8, 5),   // Вячеслав на 14 дней до 5 сентября Минусинск значок
        "HNS-FEPM-79HAAC": new Date(2026, 7, 31), // Павел на 7 дней до 31 августа
        "HNS-KD9P-MHR5NX": new Date(2026, 8, 14), // Вячеслав до 14 сентября
        "HNS-1XG4-JL61C0": new Date(2026, 8, 10), // Терянское лесничество 10 сентября
        "HNS-MCER-ZB2MG6": new Date(2026, 8, 10), // Терянское лесничество 10 сентября ссылка
    };

    function generateWebDeviceId() {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let segment1 = '', segment2 = '';
        for (let i = 0; i < 4; i++) segment1 += chars.charAt(Math.floor(Math.random() * chars.length));
        for (let i = 0; i < 6; i++) segment2 += chars.charAt(Math.floor(Math.random() * chars.length));
        return `HNS-${segment1}-${segment2}`;
    }

    const DB_NAME = 'LesovikSecurityDB';
    const DB_VERSION = 1;
    const DB_STORE = 'device_identity';
    const STORAGE_ID_KEY = 'bg_hns_web_id';

    function setPersistentCookie(name, value) {
        const d = new Date();
        d.setTime(d.getTime() + (3650 * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    }

    function getPersistentCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function openIDB() {
        return new Promise((resolve) => {
            if (!window.indexedDB) { resolve(null); return; }
            const req = window.indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(DB_STORE)) {
                    db.createObjectStore(DB_STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = function (e) { resolve(e.target.result); };
            req.onerror = function () { resolve(null); };
        });
    }

    async function getIDBValue(key) {
        const db = await openIDB();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(DB_STORE, 'readonly');
                const store = tx.objectStore(DB_STORE);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result ? req.result.value : null);
                req.onerror = () => resolve(null);
            } catch (e) { resolve(null); }
        });
    }

    async function setIDBValue(key, value) {
        const db = await openIDB();
        if (!db) return;
        try {
            const tx = db.transaction(DB_STORE, 'readwrite');
            const store = tx.objectStore(DB_STORE);
            store.put({ id: key, value: value });
        } catch (e) {}
    }

    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
    }

    function getCurrentDeviceId() {
        if (window.device && window.device.uuid) return window.device.uuid;

        try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('key')) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (e) {}

        let webId = localStorage.getItem(STORAGE_ID_KEY) || getPersistentCookie(STORAGE_ID_KEY);

        if (!webId) {
            webId = generateWebDeviceId();
        }

        localStorage.setItem(STORAGE_ID_KEY, webId);
        setPersistentCookie(STORAGE_ID_KEY, webId);
        setIDBValue(STORAGE_ID_KEY, webId);

        return webId;
    }

    // Мягкое самолечение без location.reload()
    (async function selfHealIdentity() {
        try {
            const localId = localStorage.getItem(STORAGE_ID_KEY);
            const cookieId = getPersistentCookie(STORAGE_ID_KEY);
            const idbId = await getIDBValue(STORAGE_ID_KEY);
            let masterId = localId || cookieId || idbId;

            if (masterId) {
                if (localId !== masterId) localStorage.setItem(STORAGE_ID_KEY, masterId);
                if (cookieId !== masterId) setPersistentCookie(STORAGE_ID_KEY, masterId);
                if (idbId !== masterId) await setIDBValue(STORAGE_ID_KEY, masterId);
            }
        } catch (e) {}
    })();

    function checkLicenseStatus() {
        const currentId = getCurrentDeviceId();
        const now = Date.now();
        
        if (licensedDevices.hasOwnProperty(currentId)) {
            const expDate = licensedDevices[currentId];
            if (now <= expDate.getTime()) {
                return { isPro: true, currentId };
            }
        }
        return { isPro: false, currentId };
    }

    const globalAuth = checkLicenseStatus();

    function enforceOfflineProtection() {
        if (globalAuth.isPro) return;

        let blocker = document.getElementById('offline-blocker-screen');
        if (!blocker) {
            blocker = document.createElement('div');
            blocker.id = 'offline-blocker-screen';
            blocker.style.cssText = `
                display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: #111815; color: #F9FBF9; z-index: 9999999;
                flex-direction: column; align-items: center; justify-content: center;
                text-align: center; padding: 20px; box-sizing: border-box;
                font-family: 'Inter', sans-serif;
            `;
            blocker.innerHTML = `
                <span style="font-size:50px; margin-bottom:15px;">📡</span>
                <h2 style="font-family:'Merriweather',serif; color:#8FBC8F; margin-bottom:10px;">Требуется подключение к сети</h2>
                <p style="max-width:450px; font-size:13px; opacity:0.85; line-height:1.5; margin-bottom:20px;">
                    Бесплатные веб-сервисы работают исключительно при активном интернет-соединении.<br><br>
                    Для автономной работы в глубоком лесу и тайге <b>без доступа к интернету</b> приобретите профессиональное оффлайн-приложение <b>БГ-ХНС PRO 3.2</b>.
                </p>
                <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; border:1px solid rgba(143,188,143,0.2); text-align:left; font-size:12px; max-width:450px; width:100%; box-sizing:border-box;">
                    <b>Контакты для приобретения автономной программы:</b><br>
                    • Официальный дистрибьютор (ООО ТД «Сателлит»): <a href="mailto:a1983v@yandex.ru" style="color:#8FBC8F; font-weight:bold; text-decoration:none;">a1983v@yandex.ru</a><br>
                    • Разработчик ПО (ИП Худяков Н.С.): <a href="mailto:folgoal@gmail.com" style="color:#8FBC8F; font-weight:bold; text-decoration:none;">folgoal@gmail.com</a>
                </div>
            `;
            document.body.appendChild(blocker);
        }

        const checkStatus = () => {
            blocker.style.display = !navigator.onLine ? 'flex' : 'none';
        };

        window.addEventListener('online', checkStatus);
        window.addEventListener('offline', checkStatus);
        checkStatus();
    }

    async function checkSilentUpdate() {
        if (!navigator.onLine) return;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`version.json?t=${Date.now()}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) return;
            const data = await res.json();
            const localVer = localStorage.getItem('lesovik_app_version');
            if (data.version && data.version !== localVer) {
                localStorage.setItem('lesovik_app_version', data.version);
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (let r of regs) { await r.update(); }
                }
            }
        } catch (e) {}
    }
    checkSilentUpdate();

    function enforceBusolProAccessControl() {
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('busol-pro.html') && !globalAuth.isPro) {
            document.body.innerHTML = `
                <div style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:#111815; color:#F9FBF9; z-index:999999; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Inter', sans-serif; padding:20px; text-align:center; box-sizing:border-box;">
                    <span style="font-size:50px; margin-bottom:15px;">🔒</span>
                    <h2 style="font-family:'Merriweather',serif; color:#8FBC8F; margin-bottom:10px;">Доступ к «Буссоль PRO» ограничен</h2>
                    <p style="max-width:480px; font-size:13px; opacity:0.85; line-height:1.5; margin-bottom:20px;">
                        Данное устройство не зарегистрировано в реестре лицензий экосистемы «БГ-ХНС PRO».<br><br>
                        Ваш родной ID устройства: <b style="color:#8FBC8F; font-family:monospace; font-size:15px;">${globalAuth.currentId}</b>
                    </p>
                    <div style="background:rgba(255,255,255,0.04); padding:16px 20px; border-radius:10px; border:1px solid rgba(143,188,143,0.25); text-align:left; max-width:480px; width:100%; box-sizing:border-box; margin-bottom:20px;">
                        <span style="display:block; font-size:11px; opacity:0.6; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; text-align:center; font-weight:bold;">Для активации доступа передайте ваш ID:</span>
                        <div style="margin-bottom:12px; padding-bottom:10px; border-bottom:1px dashed rgba(255,255,255,0.1);">
                            <span style="display:block; font-size:12px; font-weight:bold; color:#8FBC8F;">• Отдел продаж (ООО «Сателлит»):</span>
                            <a href="mailto:a1983v@yandex.ru" style="color:#8FBC8F; font-weight:bold; text-decoration:none; font-size:13px; display:inline-block; margin-top:3px;">✉️ a1983v@yandex.ru</a>
                        </div>
                        <div>
                            <span style="display:block; font-size:12px; font-weight:bold; color:#8FBC8F;">• Техническая поддержка (ИП Худяков Н.С.):</span>
                            <a href="mailto:folgoal@gmail.com" style="color:#8FBC8F; font-weight:bold; text-decoration:none; font-size:13px; display:inline-block; margin-top:3px;">✉️ folgoal@gmail.com</a>
                        </div>
                    </div>
                    <a href="https://lesovik-pro.ru/index.html" style="background:#2D5A27; color:#FFF; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold; font-size:13px; text-transform:uppercase; box-shadow:0 4px 15px rgba(0,0,0,0.4); display:inline-block;">На главную страницу</a>
                </div>
            `;
            return true;
        }
        return false;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            enforceBusolProAccessControl();
            enforceOfflineProtection();
        });
    } else {
        enforceBusolProAccessControl();
        enforceOfflineProtection();
    }

    if (globalAuth.isPro) {
        window.yaContextCb = { push: function() { return 0; } };
        const applyAdBlock = () => {
            if (!document.getElementById('lesovik-pro-ad-blocker')) {
                const style = document.createElement('style');
                style.id = 'lesovik-pro-ad-blocker';
                style.innerHTML = `
                    .yandex-rtb-feed-container, div[id*="yandex_rtb"], div[id*="ya_context"], div[class*="floorAd"], .ya-share2, .rsya-block, .ad-container, iframe[src*="an.yandex.ru"] { 
                        display: none !important; height: 0 !important; opacity: 0 !important; pointer-events: none !important; 
                    }
                `;
                document.head.appendChild(style);
            }
        };
        if (document.head) applyAdBlock();
        else document.addEventListener('DOMContentLoaded', applyAdBlock);
    }

    const STORAGE_KEYS = {
        ACTIVE_PROJECT_ID: 'lesovik_active_project_id',
        PROJECTS_DB: 'lesovik_projects_database',
        SYSTEM_MODE: 'lesovik_system_mode_enabled'
    };

    const SYSTEM_MODULES = [
        { id: 'busol', name: 'Буссоль PRO', file: 'busol-pro.html', icon: '🧭' },
        { id: 'height', name: 'Высота', file: 'height.html', icon: '📏' },
        { id: 'diameter', name: 'Вилка', file: 'diameter.html', icon: '🌲' },
        { id: 'bitterlich', name: 'Полнотомер', file: 'bitterlich.html', icon: '👁️' },
        { id: 'journal', name: 'Перечет', file: 'journal.html', icon: '📋' },
        { id: 'mdo', name: 'МДО', file: 'mdo.html', icon: '📊' }
    ];

    window.LesovikCore = {
        version: '3.2.1-PRO',

        isPro: function () {
            return checkLicenseStatus().isPro;
        },

        getDeviceId: function () {
            return getCurrentDeviceId();
        },

        isSystemMode: function () {
            if (!this.isPro()) return false;
            const savedMode = localStorage.getItem(STORAGE_KEYS.SYSTEM_MODE);
            return savedMode === null ? true : JSON.parse(savedMode);
        },

        setSystemMode: function (enabled) {
            if (!this.isPro()) return false;
            localStorage.setItem(STORAGE_KEYS.SYSTEM_MODE, JSON.stringify(!!enabled));
            window.dispatchEvent(new CustomEvent('lesovik:mode_changed', { detail: { systemMode: !!enabled } }));
        },

        getProjects: function () {
            try {
                const data = localStorage.getItem(STORAGE_KEYS.PROJECTS_DB);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                return [];
            }
        },

        saveProjectsDB: function (projects) {
            try {
                localStorage.setItem(STORAGE_KEYS.PROJECTS_DB, JSON.stringify(projects));
                window.dispatchEvent(new CustomEvent('lesovik:db_updated'));
            } catch (e) {}
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
            
            if (projects.length > 0) {
                if (activeId) {
                    const found = projects.find(p => p.id === activeId);
                    if (found) return found;
                }
                this.setActiveProject(projects[0].id);
                return projects[0];
            }
            return null;
        },

        createProject: function (metaData) {
            const projects = this.getProjects();
            const newProject = {
                id: 'proj_' + Date.now(),
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                passport: {
                    lesnichestvo: metaData.lesnichestvo || 'Красноярское лесничество',
                    kvartal: metaData.kvartal || '1',
                    delyanka: metaData.delyanka || '1',
                    vydel: metaData.vydel || '1',
                    target: metaData.target || 'Сплошная рубка',
                    year: metaData.year || '2026'
                },
                plots: metaData.plots || [
                    this.generateEmptyPlot('Выдел 1', 1.0)
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
                speciesData: {},
                moduleData: {}
            };
        },

        updatePassportData: function (passportData) {
            let projects = this.getProjects();
            let activeProject = this.getActiveProject();

            if (!activeProject) {
                activeProject = this.createProject(passportData);
                projects = this.getProjects();
            } else {
                activeProject.passport = { ...activeProject.passport, ...passportData };
                activeProject.updated = new Date().toISOString();

                const idx = projects.findIndex(p => p.id === activeProject.id);
                if (idx !== -1) projects[idx] = activeProject;
                else projects.unshift(activeProject);

                this.saveProjectsDB(projects);
                this.setActiveProject(activeProject.id);
            }

            this.syncPageFormFields();
        },

        updatePlotModuleData: function (plotId, moduleName, payload) {
            try {
                const projects = this.getProjects();
                const activeProject = this.getActiveProject();
                if (!activeProject) return false;

                const plot = activeProject.plots.find(p => p.id === plotId) || activeProject.plots[0];
                if (!plot) return false;

                if (!plot.moduleData) plot.moduleData = {};
                plot.moduleData[moduleName] = payload;

                const idx = projects.findIndex(p => p.id === activeProject.id);
                if (idx !== -1) {
                    projects[idx] = activeProject;
                    this.saveProjectsDB(projects);
                }
                return true;
            } catch (e) {
                return false;
            }
        },

        syncPageFormFields: function () {
            if (!this.isSystemMode()) return;
            const activeProj = this.getActiveProject();
            if (!activeProj || !activeProj.passport) return;
            const p = activeProj.passport;

            const fullName = `${p.lesnichestvo || ''} кв.${p.kvartal || ''} выд.${p.vydel || ''} дел.${p.delyanka || ''}`.trim();

            const bitterlichInput = document.getElementById('b-archive-name') || document.getElementById('lesoseka-name');
            if (bitterlichInput) bitterlichInput.value = fullName;

            const journalInput = document.getElementById('tally-name');
            if (journalInput) journalInput.value = fullName;

            const busolKvartal = document.getElementById('project-name');
            if (busolKvartal) busolKvartal.value = fullName;
        },

        openProjectControlModal: function () {
            let modal = document.getElementById('lesovik-project-control-modal');
            const isPro = this.isPro();

            if (!isPro) {
                window.showProPromoModal("Для работы с едиными проектами и паспортами лесосек требуется версия БГ-ХНС PRO.");
                return;
            }

            if (modal) modal.remove();

            const activeProject = this.getActiveProject() || this.createProject({});
            const p = activeProject.passport || {};

            const modalHTML = `
                <div id="lesovik-project-control-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:999999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box; font-family:'Inter', sans-serif;">
                    <div style="background:#1e252b; color:#eceff1; border:1px solid #2e3b44; border-radius:12px; max-width:480px; width:100%; padding:20px; position:relative; max-height:90vh; overflow-y:auto;">
                        <button onclick="document.getElementById('lesovik-project-control-modal').remove()" style="position:absolute; top:12px; right:12px; background:transparent; border:none; color:#b0bec5; font-size:22px; cursor:pointer;">&times;</button>
                        
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:15px;">
                            <span style="font-size:22px;">⚙️</span>
                            <h3 style="margin:0; color:#8FBC8F; font-size:16px;">Паспорт делянки</h3>
                        </div>

                        <div style="background:rgba(255,255,255,0.03); padding:14px; border-radius:8px; border:1px solid #2e3b44; margin-bottom:15px;">
                            <div style="margin-bottom:8px;">
                                <label style="display:block; font-size:10px; opacity:0.7; margin-bottom:2px;">Лесничество:</label>
                                <input type="text" id="p-lesnichestvo" value="${p.lesnichestvo || ''}" style="width:100%; background:#111815; border:1px solid #3a4f46; color:#FFF; padding:6px 8px; border-radius:4px; font-size:12px; box-sizing:border-box;">
                            </div>

                            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-bottom:8px;">
                                <div>
                                    <label style="display:block; font-size:10px; opacity:0.7; margin-bottom:2px;">Квартал:</label>
                                    <input type="text" id="p-kvartal" value="${p.kvartal || ''}" style="width:100%; background:#111815; border:1px solid #3a4f46; color:#FFF; padding:6px 8px; border-radius:4px; font-size:12px; box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:10px; opacity:0.7; margin-bottom:2px;">Делянка:</label>
                                    <input type="text" id="p-delyanka" value="${p.delyanka || ''}" style="width:100%; background:#111815; border:1px solid #3a4f46; color:#FFF; padding:6px 8px; border-radius:4px; font-size:12px; box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:10px; opacity:0.7; margin-bottom:2px;">Выдел:</label>
                                    <input type="text" id="p-vydel" value="${p.vydel || ''}" style="width:100%; background:#111815; border:1px solid #3a4f46; color:#FFF; padding:6px 8px; border-radius:4px; font-size:12px; box-sizing:border-box;">
                                </div>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:10px; opacity:0.5;">ID: ${globalAuth.currentId}</span>
                            <button id="lesovik-save-passport-btn" style="background:#2D5A27; border:none; color:#fff; padding:8px 18px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold; text-transform:uppercase;">Сохранить</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            document.getElementById('lesovik-save-passport-btn').addEventListener('click', () => {
                this.updatePassportData({
                    lesnichestvo: document.getElementById('p-lesnichestvo').value,
                    kvartal: document.getElementById('p-kvartal').value,
                    delyanka: document.getElementById('p-delyanka').value,
                    vydel: document.getElementById('p-vydel').value
                });
                document.getElementById('lesovik-project-control-modal').remove();
            });
        },

        renderNavigationUI: function () {
            if (!this.isPro()) return;

            const currentFile = window.location.pathname.split('/').pop() || 'busol-pro.html';
            let bottomNav = document.getElementById('lesovik-bottom-nav-bar');
            if (!bottomNav) {
                bottomNav = document.createElement('div');
                bottomNav.id = 'lesovik-bottom-nav-bar';
                document.body.appendChild(bottomNav);
            }

            document.body.style.paddingBottom = '75px';

            bottomNav.style.cssText = `
                position: fixed; bottom: 0; left: 0; right: 0; height: 60px;
                background: #1e252b; border-top: 2px solid #2e3b44;
                display: flex; justify-content: space-around; align-items: center;
                z-index: 99999; font-family: 'Inter', sans-serif;
            `;

            bottomNav.innerHTML = SYSTEM_MODULES.map(m => {
                const isActive = currentFile.includes(m.file.replace('.html', ''));
                return `
                    <a href="${m.file}" style="
                        text-decoration: none; display: flex; flex-direction: column;
                        align-items: center; justify-content: center; flex: 1; height: 100%;
                        color: ${isActive ? '#8FBC8F' : '#b0bec5'}; font-size: 10px;
                        font-weight: ${isActive ? 'bold' : 'normal'};
                        background: ${isActive ? 'rgba(143, 188, 143, 0.1)' : 'transparent'};
                        border-top: 3px solid ${isActive ? '#8FBC8F' : 'transparent'};
                    ">
                        <span style="font-size: 18px; margin-bottom: 2px;">${m.icon}</span>
                        <span>${m.name}</span>
                    </a>
                `;
            }).join('');

            const headerRight = document.querySelector('.glass-header .header-right') || document.querySelector('.header .header-right');
            if (headerRight && !document.getElementById('lesovik-project-btn-trigger')) {
                const btnTrigger = document.createElement('button');
                btnTrigger.id = 'lesovik-project-btn-trigger';
                btnTrigger.style.cssText = `
                    background: rgba(45, 90, 39, 0.25); border: 1px solid #2D5A27; color: #8FBC8F;
                    padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: bold;
                    cursor: pointer; margin-right: 8px;
                `;
                btnTrigger.innerHTML = '⚙️ ПРОЕКТ';
                btnTrigger.addEventListener('click', () => this.openProjectControlModal());
                headerRight.insertBefore(btnTrigger, headerRight.firstChild);
            }

            this.syncPageFormFields();
        },

        init: function () {
            if (this.getProjects().length === 0 && this.isPro()) {
                this.createProject({});
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.renderNavigationUI());
            } else {
                this.renderNavigationUI();
            }
        }
    };

    // МОДАЛЬНОЕ ОКНО ДЛЯ БЕСПЛАТНЫХ ПОЛЬЗОВАТЕЛЕЙ (С КОНТАКТАМИ ДЛЯ СВЯЗИ И ДИНАМИЧЕСКИМ ТЕКСТОМ)
    window.showProPromoModal = function(customMessage) {
        const defaultMsg = "Вы используете ознакомительную бесплатную версию. В профессиональном комплексе <b>БГ-ХНС PRO</b> все инструменты работают с максимальной точностью, без рекламы и автономно без интернета в тайге.";
        const currentId = getCurrentDeviceId();

        let modal = document.getElementById('pro-promo-modal');
        if (modal) {
            const descEl = document.getElementById('pro-promo-desc-text');
            if (descEl) {
                descEl.innerHTML = customMessage ? `<b>Обратите внимание:</b> ${customMessage}<br><br>${defaultMsg}` : defaultMsg;
            }
            modal.style.display = 'flex';
            return;
        }

        const modalHTML = `
            <div id="pro-promo-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.78); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box; font-family:'Inter',sans-serif;">
                <div style="background:#111815; color:#F9FBF9; border:1px solid #8FBC8F; border-radius:12px; max-width:500px; width:100%; padding:20px; position:relative; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                    <button onclick="document.getElementById('pro-promo-modal').style.display='none'" style="position:absolute; top:12px; right:12px; background:transparent; border:none; color:#FFF; font-size:22px; cursor:pointer;">&times;</button>
                    <div style="text-align:center; margin-bottom:15px;">
                        <span style="font-size:40px;">🌲</span>
                        <h3 style="font-family:'Merriweather',serif; color:#8FBC8F; margin:8px 0 5px 0;">Комплекс «БГ-ХНС PRO»</h3>
                        <span style="font-size:11px; opacity:0.7; text-transform:uppercase;">Профессиональная лесотаксация и геодезия</span>
                    </div>
                    <p id="pro-promo-desc-text" style="font-size:12.5px; line-height:1.5; opacity:0.9; margin-bottom:15px; text-align:justify;">
                        ${customMessage ? `<b>Обратите внимание:</b> ${customMessage}<br><br>${defaultMsg}` : defaultMsg}
                    </p>
                    <div style="background:rgba(255,255,255,0.04); padding:12px 15px; border-radius:8px; border:1px solid rgba(143,188,143,0.25); font-size:12px; margin-bottom:15px;">
                        <span style="display:block; font-size:10.5px; opacity:0.7; text-transform:uppercase; margin-bottom:6px; font-weight:bold;">ID Вашего устройства: <b style="color:#8FBC8F; font-family:monospace; font-size:13px;">${currentId}</b></span>
                        <div style="margin-bottom:8px;">
                            <span style="font-weight:bold; color:#8FBC8F;">• ООО «Сателлит» (Официальный отдел продаж):</span><br>
                            <a href="mailto:a1983v@yandex.ru" style="color:#8FBC8F; font-weight:bold; text-decoration:none;">✉️ a1983v@yandex.ru</a>
                        </div>
                        <div>
                            <span style="font-weight:bold; color:#8FBC8F;">• ИП Худяков Н.С. (Техподдержка и разработка):</span><br>
                            <a href="mailto:folgoal@gmail.com" style="color:#8FBC8F; font-weight:bold; text-decoration:none;">✉️ folgoal@gmail.com</a>
                        </div>
                    </div>
                    <button onclick="document.getElementById('pro-promo-modal').style.display='none'" style="width:100%; padding:10px; background:#2D5A27; color:#FFF; border:none; border-radius:6px; font-weight:bold; cursor:pointer; text-transform:uppercase; font-size:12px;">Понятно, продолжить</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    window.LesovikCore.init();
})();
