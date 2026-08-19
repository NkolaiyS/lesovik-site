/**
 * ============================================================================
 * ЛЕСОВИК-CORE (lesovik-core.js)
 * Центральное ядро экосистемы «Лесовик PRO»
 * ============================================================================
 * Версия: 2.9.8 (Постоянное хранение IndexedDB, Self-healing, Защита офлайна)
 * Автор / Владелец: Николай Сергеевич Худяков (ИП Худяков Н.С.)
 * Экосистема: РЕСУРС (https://resurs-stretch.ru/)
 * ============================================================================
 */

(function () {
    'use strict';

    // ------------------------------------------------------------------------
    // 1. РЕЕСТР АКТИВИРОВАННЫХ УСТРОЙСТВ И СРОКИ ДЕЙСТВИЯ ЛИЦЕНЗИЙ
    // ------------------------------------------------------------------------
    // Месяцы в JS: 0-Янв, 1-Фев, 2-Мар, 3-Апр, 4-Май, 5-Июн, 6-Июл, 7-Авг, 8-Сен, 9-Окт, 10-Ноя, 11-Дек
    const licensedDevices = {
        "HNS-I6UX-FQXE0J": new Date(2099, 11, 31), // Бессрочно (iPhone Яндекс Николай)
        "HNS-3T7D-ZJKISD": new Date(2099, 11, 31), // Бессрочно (iPhone Safari Николай)
        "HNS-0EEC-NJR6JS": new Date(2099, 11, 31), // Бессрочно (Web Николай)
        "HNS-3K0F-5IHF3A": new Date(2099, 11, 31), // Бессрочно (Android Николай)
        "HNS-3SBX-TQMJO7": new Date(2026, 11, 31), // До 31 декабря 2026 (Ноутбук)
        "HNS-MINCIFRA-TEST": new Date(2099, 11, 31),// Доступ экспертов Минцифры
        "HNS-HS86-KK7HRA": new Date(2026, 11, 31),  // Андрей (Редми) до 31 декабря 2026
        "HNS-YSXJ-TBINAL": new Date(2026, 11, 31), // Андрей (Хуавей) до 31 декабря 2026
        "HNS-4L1E-25O9U6": new Date(2026, 7, 31),   // Хонор 7 до 31 августа 2026
        "HNS-YU2O-2MRLAE": new Date(2099, 11, 31), // Бессрочно (Android Павел брат)
    };

    // 1.1 Генератор уникального ID
    function generateWebDeviceId() {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let segment1 = '', segment2 = '';
        for (let i = 0; i < 4; i++) segment1 += chars.charAt(Math.floor(Math.random() * chars.length));
        for (let i = 0; i < 6; i++) segment2 += chars.charAt(Math.floor(Math.random() * chars.length));
        return `HNS-${segment1}-${segment2}`;
    }

    // 1.2 Асинхронное постоянное хранилище IndexedDB (Несгораемая память)
    const DB_NAME = 'LesovikSecurityDB';
    const DB_VERSION = 1;
    const DB_STORE = 'device_identity';

    function openIDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                resolve(null);
                return;
            }
            const req = window.indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(DB_STORE)) {
                    db.createObjectStore(DB_STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = function (e) { resolve(e.target.result); };
            req.onerror = function (e) { resolve(null); };
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

    // Запрос на запрет очистки памяти системой Android
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(persistent => {
            if (persistent) console.log('[Lesovik Core] Хранилище защищено от очистки Android.');
        }).catch(() => {});
    }

    // 1.3 Получение строго родного ID устройства с механизмом Self-Healing
    function getCurrentDeviceId() {
        if (window.device && window.device.uuid) {
            return window.device.uuid;
        }

        // Очищаем адресную строку от устаревших ссылок ?key=
        try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('key')) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (e) {}

        let webId = localStorage.getItem('bg_hns_web_id');
        if (!webId) {
            webId = generateWebDeviceId();
            localStorage.setItem('bg_hns_web_id', webId);
            setIDBValue('bg_hns_web_id', webId);
        } else {
            setIDBValue('bg_hns_web_id', webId);
        }
        return webId;
    }

    // Фоновое восстановление ID из IndexedDB, если localStorage был очищен
    (async function selfHealIdentity() {
        try {
            const localId = localStorage.getItem('bg_hns_web_id');
            const idbId = await getIDBValue('bg_hns_web_id');
            if (!localId && idbId) {
                localStorage.setItem('bg_hns_web_id', idbId);
                console.log('[Lesovik Core] ID восстановлен из защищенной памяти IndexedDB:', idbId);
                location.reload();
            } else if (localId && !idbId) {
                await setIDBValue('bg_hns_web_id', localId);
            }
        } catch (e) {}
    })();

    function checkLicenseStatus() {
        const currentId = getCurrentDeviceId();
        const now = Date.now();
        
        if (licensedDevices.hasOwnProperty(currentId)) {
            const expDate = licensedDevices[currentId];
            if (now <= expDate.getTime()) {
                return { isPro: true, currentId }; // Лицензия активна
            }
        }
        return { isPro: false, currentId }; // Ограниченный/Бесплатный режим
    }

    const globalAuth = checkLicenseStatus();

    // ------------------------------------------------------------------------
    // 1.4 АВТОМАТИЧЕСКАЯ ЗАЩИТА ОФФЛАЙН-РЕЖИМА ДЛЯ БЕСПЛАТНЫХ ПОЛЬЗОВАТЕЛЕЙ
    // ------------------------------------------------------------------------
    function enforceOfflineProtection() {
        if (globalAuth.isPro) return; // PRO-пользователям оффлайн доступен полностью

        let blocker = document.getElementById('offline-blocker-screen');
        if (!blocker) {
            blocker = document.createElement('div');
            blocker.id = 'offline-blocker-screen';
            blocker.style.cssText = `
                display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: #111815; color: #F9FBF9; z-index: 9999999;
                flex-direction: column; align-items: center; justify-content: center;
                text-align: center; padding: 20px; box-sizing: border-box;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            `;
            blocker.innerHTML = `
                <span style="font-size:50px; margin-bottom:15px;">📡</span>
                <h2 style="font-family:'Merriweather',serif; color:#8FBC8F; margin-bottom:10px;">Требуется подключение к сети</h2>
                <p style="max-width:450px; font-size:13px; opacity:0.85; line-height:1.5; margin-bottom:20px;">
                    Бесплатные веб-сервисы работают исключительно при активном интернет-соединении.<br><br>
                    Для автономной работы в глубоком лесу и тайге <b>без доступа к интернету</b> приобретите профессиональное оффлайн-приложение <b>БГ-ХНС PRO 2.6</b>.
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
            if (!navigator.onLine) {
                blocker.style.display = 'flex';
            } else {
                blocker.style.display = 'none';
            }
        };

        window.addEventListener('online', checkStatus);
        window.addEventListener('offline', checkStatus);
        checkStatus();
    }

    // --- ФОНОВАЯ ТИХАЯ ПРОВЕРКА ВЕРСИИ ---
    async function checkSilentUpdate() {
        if (!navigator.onLine) return;
        try {
            const res = await fetch(`version.json?t=${Date.now()}`);
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
        } catch (e) {
            // Игнорируем ошибки сети
        }
    }
    checkSilentUpdate();

    // ------------------------------------------------------------------------
    // 2. БЛОКИРОВЩИК ЗАКРЫТЫХ МОДУЛЕЙ ДЛЯ НЕАВТОРИЗОВАННЫХ ПОЛЬЗОВАТЕЛЕЙ
    // ------------------------------------------------------------------------
    function enforceBusolProAccessControl() {
        const currentPath = window.location.pathname.toLowerCase();
        
        if (currentPath.includes('busol-pro.html')) {
            if (!globalAuth.isPro) {
                document.body.innerHTML = `
                    <div style="position:fixed; top:0; left:0; width:100vw; height:100vh; 
                                background:#111815; color:#F9FBF9; z-index:999999; 
                                display:flex; flex-direction:column; align-items:center; 
                                justify-content:center; font-family:'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding:20px; text-align:center; box-sizing:border-box;">
                        
                        <span style="font-size:50px; margin-bottom:15px;">🔒</span>
                        <h2 style="font-family:'Merriweather',serif; color:#8FBC8F; margin-bottom:10px;">Доступ к «Буссоль PRO 2.6» ограничен</h2>
                        
                        <p style="max-width:480px; font-size:13px; opacity:0.85; line-height:1.5; margin-bottom:20px;">
                            Данное устройство не зарегистрировано в реестре лицензий экосистемы «БГ-ХНС PRO 2.6».<br><br>
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

                        <a href="https://lesovik-pro.ru/busol.html" style="background:#2D5A27; color:#FFF; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold; font-size:13px; text-transform:uppercase; box-shadow:0 4px 15px rgba(0,0,0,0.4); display:inline-block;">
                            🌐 Перейти в бесплатную версию
                        </a>
                    </div>
                `;
                return true;
            }
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

    // БЛОКИРОВКА РЕКЛАМЫ ТОЛЬКО ДЛЯ ЛИЦЕНЗИОННЫХ УСТРОЙСТВ
    if (globalAuth.isPro) {
        window.yaContextCb = { push: function() { return 0; } };
        const applyAdBlock = () => {
            if (!document.getElementById('lesovik-pro-ad-blocker')) {
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
                document.head.appendChild(style);
            }
        };

        if (document.head) applyAdBlock();
        else document.addEventListener('DOMContentLoaded', applyAdBlock);
    }

    // ------------------------------------------------------------------------
    // 3. КОНСТАНТЫ И НАСТРОЙКИ СИСТЕМЫ
    // ------------------------------------------------------------------------
    const STORAGE_KEYS = {
        PRO_LICENSE: 'lesovik_pro_license_key',
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

    // ------------------------------------------------------------------------
    // 4. ЕДИНЫЙ API LESOVIKCORE
    // ------------------------------------------------------------------------
    window.LesovikCore = {
        version: '2.9.8-PRO',

        isPro: function () {
            return checkLicenseStatus().isPro;
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
                if (idx !== -1) {
                    projects[idx] = activeProject;
                } else {
                    projects.unshift(activeProject);
                }

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
                console.warn('LesovikCore: Ошибка записи модуля', e);
                return false;
            }
        },

        syncPageFormFields: function () {
            if (!this.isSystemMode()) return;
            const activeProj = this.getActiveProject();
            if (!activeProj || !activeProj.passport) return;
            const p = activeProj.passport;

            const fullName = `${p.lesnichestvo || ''} кв.${p.kvartal || ''} выд.${p.vydel || ''} дел.${p.delyanka || ''}`.trim();

            const bitterlichInput = document.getElementById('lesoseka-name');
            if (bitterlichInput) bitterlichInput.value = fullName;

            const journalInput = document.getElementById('tally-name');
            if (journalInput) journalInput.value = fullName;

            const busolKvartal = document.getElementById('kvartal-input');
            if (busolKvartal) busolKvartal.value = `Кв. ${p.kvartal || ''}, Выд. ${p.vydel || ''}`;

            const mdoLes = document.getElementById('mdo-lesnichestvo');
            if (mdoLes && p.lesnichestvo) mdoLes.value = p.lesnichestvo;
            const mdoKvk = document.getElementById('mdo-kvartal');
            if (mdoKvk && p.kvartal) mdoKvk.value = p.kvartal;
            const mdoVyd = document.getElementById('mdo-vydel');
            if (mdoVyd && p.vydel) mdoVyd.value = p.vydel;
            const mdoDel = document.getElementById('mdo-delyanka');
            if (mdoDel && p.delyanka) mdoDel.value = p.delyanka;
            const mdoTarget = document.getElementById('mdo-target');
            if (mdoTarget && p.target) mdoTarget.value = p.target;

            const mdoArchiveName = document.getElementById('mdo-archive-name');
            if (mdoArchiveName) mdoArchiveName.value = `Кв. ${p.kvartal || ''}, Выд. ${p.vydel || ''}, Дел. ${p.delyanka || ''}`;
        },

        openProjectControlModal: function () {
            let modal = document.getElementById('lesovik-project-control-modal');
            const isPro = this.isPro();
            const isSystemMode = this.isSystemMode();

            if (!isPro) {
                window.showProPromoModal();
                return;
            }

            if (modal) modal.remove();

            const activeProject = this.getActiveProject() || this.createProject({});
            const p = activeProject.passport || {};

            const modalHTML = `
                <div id="lesovik-project-control-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:999999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="background:#1e252b; color:#eceff1; border:1px solid #2e3b44; border-radius:12px; max-width:480px; width:100%; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.6); position:relative; max-height:90vh; overflow-y:auto;">
                        <button onclick="document.getElementById('lesovik-project-control-modal').remove()" style="position:absolute; top:12px; right:12px; background:transparent; border:none; color:#b0bec5; font-size:22px; cursor:pointer;">&times;</button>
                        
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:15px;">
                            <span style="font-size:22px;">⚙️</span>
                            <h3 style="margin:0; color:#8FBC8F; font-size:16px;">Настройка проекта и Паспорт делянки</h3>
                        </div>

                        <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px; border:1px solid #2e3b44; margin-bottom:15px;">
                            <div style="font-size:11px; color:#b0bec5; margin-bottom:6px; font-weight:bold; text-transform:uppercase;">Режим работы экосистемы:</div>
                            <label style="display:flex; align-items:center; cursor:pointer; font-size:13px; color:#fff;">
                                <input type="checkbox" id="m-system-mode-toggle" ${isSystemMode ? 'checked' : ''} style="width:18px; height:18px; margin-right:8px; accent-color:#2D5A27;">
                                <span style="font-weight:bold; color:${isSystemMode ? '#8FBC8F' : '#FFA726'};">
                                    ${isSystemMode ? '🔗 В СВЯЗКЕ (Единый проект)' : '⚡ АВТОНОМНО'}
                                </span>
                            </label>
                        </div>

                        <div style="background:rgba(255,255,255,0.03); padding:14px; border-radius:8px; border:1px solid #2e3b44; margin-bottom:15px;">
                            <div style="font-size:12px; color:#8FBC8F; font-weight:bold; margin-bottom:10px; text-transform:uppercase;">📋 Реквизиты объекта (Паспорт):</div>
                            
                            <div style="margin-bottom:8px;">
                                <label style="display:block; font-size:10px; opacity:0.7; margin-bottom:2px;">Лесничество / Участковое:</label>
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

                            <div style="display:flex; gap:8px;">
                                <div style="flex:2;">
                                    <label style="display:block; font-size:10px; opacity:0.7; margin-bottom:2px;">Вид пользования / Цель:</label>
                                    <input type="text" id="p-target" value="${p.target || ''}" style="width:100%; background:#111815; border:1px solid #3a4f46; color:#FFF; padding:6px 8px; border-radius:4px; font-size:12px; box-sizing:border-box;">
                                </div>
                                <div style="flex:1;">
                                    <label style="display:block; font-size:10px; opacity:0.7; margin-bottom:2px;">Год:</label>
                                    <input type="text" id="p-year" value="${p.year || '2026'}" style="width:100%; background:#111815; border:1px solid #3a4f46; color:#FFF; padding:6px 8px; border-radius:4px; font-size:12px; box-sizing:border-box;">
                                </div>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:10px; opacity:0.5;">ID устройства: ${globalAuth.currentId}</span>
                            <button id="lesovik-save-passport-btn" style="background:#2D5A27; border:none; color:#fff; padding:8px 18px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold; text-transform:uppercase;">Сохранить Паспорт</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            document.getElementById('m-system-mode-toggle').addEventListener('change', (e) => {
                this.setSystemMode(e.target.checked);
            });

            document.getElementById('lesovik-save-passport-btn').addEventListener('click', () => {
                this.updatePassportData({
                    lesnichestvo: document.getElementById('p-lesnichestvo').value,
                    kvartal: document.getElementById('p-kvartal').value,
                    delyanka: document.getElementById('p-delyanka').value,
                    vydel: document.getElementById('p-vydel').value,
                    target: document.getElementById('p-target').value,
                    year: document.getElementById('p-year').value
                });
                document.getElementById('lesovik-project-control-modal').remove();
                location.reload();
            });
        },

        // ЧИСТАЯ НАВИГАЦИЯ (БЕЗ ?key= В ССЫЛКАХ)
        renderNavigationUI: function () {
            if (!this.isPro() && window.location.pathname.toLowerCase().includes('busol-pro.html')) {
                return;
            }

            const currentFile = window.location.pathname.split('/').pop() || 'busol-pro.html';
            const isPro = this.isPro();
            const isSystemMode = this.isSystemMode();

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

            const headerRight = document.querySelector('.glass-header .header-right') || document.querySelector('.header .header-right');
            if (headerRight && !document.getElementById('lesovik-project-btn-trigger')) {
                const btnTrigger = document.createElement('button');
                btnTrigger.id = 'lesovik-project-btn-trigger';
                btnTrigger.style.cssText = `
                    background: rgba(45, 90, 39, 0.25);
                    border: 1px solid #2D5A27;
                    color: #8FBC8F;
                    padding: 5px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: bold;
                    cursor: pointer;
                    margin-right: 8px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                `;
                
                const statusLabel = (isPro && isSystemMode) ? '🔗 В СВЯЗКЕ' : '⚙️ ПРОЕКТ';
                btnTrigger.innerHTML = statusLabel;
                btnTrigger.addEventListener('click', () => this.openProjectControlModal());
                headerRight.insertBefore(btnTrigger, headerRight.firstChild);
            }

            this.syncPageFormFields();
        },

        init: function () {
            if (this.getProjects().length === 0 && this.isPro()) {
                this.createProject({
                    lesnichestvo: 'Красноярское лесничество',
                    kvartal: '1',
                    delyanka: '1',
                    vydel: '1'
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
                        <h3 style="font-family:'Merriweather',serif; color:#8FBC8F; margin:8px 0 5px 0;">Единая экосистема «БГ-ХНС PRO 2.6»</h3>
                        <span style="font-size:11px; opacity:0.7; text-transform:uppercase;">Сквозной контекст • Бесшовная связка 6 инструментов</span>
                    </div>
                    <p style="font-size:12px; line-height:1.5; opacity:0.9; margin-bottom:15px; text-align:justify;">
                        Вы используете бесплатную автономную версию калькулятора. В версии <b>PRO 2.6</b> все 6 инструментов объединяются в единую сеть без рекламы и работают полностью оффлайн в тайге.
                    </p>
                    <div style="background:rgba(255,255,255,0.04); padding:12px 15px; border-radius:8px; border:1px solid rgba(143,188,143,0.25); font-size:12px; margin-bottom:15px;">
                        <span style="display:block; font-size:10px; opacity:0.6; text-transform:uppercase; margin-bottom:6px; font-weight:bold;">Ваш родной ID устройства: <b style="color:#8FBC8F; font-family:monospace;">${currentId}</b></span>
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
