/**
 * ============================================================================
 * ЛЕСОВИК-CORE (lesovik-core.js)
 * Центральное ядро экосистемы «Лесовик PRO»
 * Разработка и автоматизация для таксации и отвода лесосек
 * ============================================================================
 * Версия: 2.8.0 (Сквозной Паспорт с Выделом + Фиксация активного объекта)
 * Автор / Владелец: Николай Сергеевич Худяков (ИП Худяков Н.С.)
 * Экосистема: РЕСУРС (https://resurs-stretch.ru/)
 * ============================================================================
 */

(function () {
    'use strict';

    // ------------------------------------------------------------------------
    // 1. ПРОВЕРКА ЛИЦЕНЗИИ И СТРОГИЙ КОНТРОЛЬ РЕКЛАМЫ (РСЯ)
    // ------------------------------------------------------------------------
    const licensedDevices = {
        "HNS-RAL2-45TCN0": new Date(2099, 11, 31),  // Бессрочно (iPhone Яндекс)
        "HNS-DDFW-V15MN9": new Date(2099, 11, 31),  // Бессрочно (iPhone Safari)
        "HNS-3SBX-TQMJO7": new Date(2026, 11, 31),  // До 31 декабря 2026 (Ноутбук)
        "HNS-MINCIFRA-TEST": new Date(2099, 11, 31),// Доступ экспертов Минцифры
        "HNS-0LE2-PK7CV9": new Date(2099, 7, 31),   // ТЕСТ ПРО до 31 августа (web Николай)
        "HNS-8Z8T-R49OSZ": new Date(2099, 7, 31),   // ТЕСТ ПРО до 31 августа (Андрей редми)
        "HNS-6680-TVK32U": new Date(2099, 7, 5),   // ТЕСТ ПРО до 5 августа (мой хонор 7)
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
        
        if (licensedDevices.hasOwnProperty(currentId)) {
            const expDate = licensedDevices[currentId];
            if (now <= expDate.getTime()) {
                return { isPro: true, currentId }; // Лицензия активна
            }
        }
        return { isPro: false, currentId }; // Бесплатный режим
    }

    const globalAuth = checkLicenseStatus();

    // --- ФОНОВАЯ ТИХАЯ ПРОВЕРКА ВЕРСИИ (SILENT UPDATE) ---
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
            // Игнорируем ошибки сети при проверке
        }
    }
    checkSilentUpdate();

    // ------------------------------------------------------------------------
    // 2. ГЛУХАЯ ЗАГЛУШКА-БЛОКИРОВЩИК ДЛЯ BUSOL-PRO (ЕСЛИ НЕТ ЛИЦЕНЗИИ)
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
                        <h2 style="font-family:'Merriweather',serif; color:#8FBC8F; margin-bottom:10px;">Доступ к «Буссоль PRO» ограничен</h2>
                        
                        <p style="max-width:480px; font-size:13px; opacity:0.85; line-height:1.5; margin-bottom:20px;">
                            Модуль «Буссоль PRO» является закрытым офлайн-инструментом. Период демонстрационной установки завершен или лицензия не активирована.<br><br>
                            Ваш ID устройства: <b style="color:#8FBC8F; font-family:monospace; font-size:15px;">${globalAuth.currentId}</b>
                        </p>
                        
                        <div style="background:rgba(255,255,255,0.04); padding:16px 20px; border-radius:10px; border:1px solid rgba(143,188,143,0.25); text-align:left; max-width:480px; width:100%; box-sizing:border-box; margin-bottom:20px;">
                            <span style="display:block; font-size:11px; opacity:0.6; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; text-align:center; font-weight:bold;">Для приобретения и продления лицензии:</span>
                            
                            <div style="margin-bottom:12px; padding-bottom:10px; border-bottom:1px dashed rgba(255,255,255,0.1);">
                                <span style="display:block; font-size:12px; font-weight:bold; color:#8FBC8F;">• Официальный дистрибьютор (ООО «Сателлит»):</span>
                                <span style="display:block; font-size:12px; opacity:0.85; margin-top:2px;">Отдел продаж / Продление ключей:</span>
                                <a href="mailto:a1983v@yandex.ru" style="color:#8FBC8F; font-weight:bold; text-decoration:none; font-size:13px; display:inline-block; margin-top:3px;">✉️ a1983v@yandex.ru</a>
                            </div>

                            <div>
                                <span style="display:block; font-size:12px; font-weight:bold; color:#8FBC8F;">• Отдел разработки ПО (ИП Худяков Н.С.):</span>
                                <span style="display:block; font-size:12px; opacity:0.85; margin-top:2px;">Техническая поддержка:</span>
                                <a href="mailto:folgoal@gmail.com" style="color:#8FBC8F; font-weight:bold; text-decoration:none; font-size:13px; display:inline-block; margin-top:3px;">✉️ folgoal@gmail.com</a>
                            </div>
                        </div>

                        <a href="https://lesovik-pro.ru/busol.html" style="background:#2D5A27; color:#FFF; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold; font-size:13px; text-transform:uppercase; box-shadow:0 4px 15px rgba(0,0,0,0.4); display:inline-block;">
                            🌐 Перейти в бесплатную онлайн-версию
                        </a>
                    </div>
                `;
                return true;
            }
        }
        return false;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enforceBusolProAccessControl);
    } else {
        enforceBusolProAccessControl();
    }

    // БЛОКИРУЕМ РЕКЛАМУ ТОЛЬКО ДЛЯ PRO-ПОЛЬЗОВАТЕЛЕЙ
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
        version: '2.8.0-PRO',

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
                // Если активный ID не задан или не найден, делаем активным первый проект
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

        // БЕЗОПАСНАЯ ЗАПИСЬ ДАННЫХ МОДУЛЕЙ (ВЫСОТОМЕР / ВИЛКА)
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

        // СИНХРОНИЗАЦИЯ ПОЛЕЙ НА ФОРМАХ СТРАНИЦ С ПАСПОРТОМ ЯДРА
        syncPageFormFields: function () {
            if (!this.isSystemMode()) return;
            const activeProj = this.getActiveProject();
            if (!activeProj || !activeProj.passport) return;
            const p = activeProj.passport;

            const fullName = `${p.lesnichestvo || ''} кв.${p.kvartal || ''} дел.${p.delyanka || ''} выд.${p.vydel || ''}`;

            // Поле в Полнотомере (bitterlich.html)
            const bitterlichInput = document.getElementById('lesoseka-name');
            if (bitterlichInput) bitterlichInput.value = fullName;

            // Поля в Буссоли (busol-pro.html)
            const busolKvartal = document.getElementById('kvartal-input');
            if (busolKvartal) busolKvartal.value = `Кв. ${p.kvartal || ''}, Выд. ${p.vydel || ''}`;

            // Поля в Перечете и МДО
            const mdoLes = document.getElementById('mdo-lesnichestvo');
            if (mdoLes) mdoLes.value = p.lesnichestvo || '';
            const mdoKvk = document.getElementById('mdo-kvartal');
            if (mdoKvk) mdoKvk.value = p.kvartal || '';
            const mdoVyd = document.getElementById('mdo-vydel');
            if (mdoVyd) mdoVyd.value = p.vydel || p.delyanka || '';
        },

        // --------------------------------------------------------------------
        // 5. ЕДИНОЕ МОДАЛЬНОЕ ОКНО УПРАВЛЕНИЯ «⚙️ ПРОЕКТ» (С ПОЛНЫМ ПАСПОРТОМ)
        // --------------------------------------------------------------------
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

                        <!-- ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМА -->
                        <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px; border:1px solid #2e3b44; margin-bottom:15px;">
                            <div style="font-size:11px; color:#b0bec5; margin-bottom:6px; font-weight:bold; text-transform:uppercase;">Режим работы экосистемы:</div>
                            <label style="display:flex; align-items:center; cursor:pointer; font-size:13px; color:#fff;">
                                <input type="checkbox" id="m-system-mode-toggle" ${isSystemMode ? 'checked' : ''} style="width:18px; height:18px; margin-right:8px; accent-color:#2D5A27;">
                                <span style="font-weight:bold; color:${isSystemMode ? '#8FBC8F' : '#FFA726'};">
                                    ${isSystemMode ? '🔗 В СВЯЗКЕ (Единый проект)' : '⚡ АВТОНОМНО'}
                                </span>
                            </label>
                        </div>

                        <!-- ФОРМА ПАСПОРТА ДЕЛЯНКИ -->
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

        // --------------------------------------------------------------------
        // 6. ОТРЕСОВКА ПРИЛИПАЮЩЕГО НИЖНЕГО МЕНЮ И КНОПКИ ШАПКИ
        // --------------------------------------------------------------------
        renderNavigationUI: function () {
            if (!this.isPro() && window.location.pathname.toLowerCase().includes('busol-pro.html')) {
                return;
            }

            const currentFile = window.location.pathname.split('/').pop() || 'busol-pro.html';
            const isPro = this.isPro();
            const isSystemMode = this.isSystemMode();
            const currentId = getCurrentDeviceId();

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

            // ФОРМИРОВАНИЕ ССЫЛОК С СОХРАНЕНИЕМ ЛИЦЕНЗИОННОГО КЛЮЧА
            bottomNav.innerHTML = SYSTEM_MODULES.map(m => {
                const isActive = currentFile.includes(m.file.replace('.html', ''));
                const fileWithKey = `${m.file}?key=${encodeURIComponent(currentId)}`;
                const linkHref = isPro ? `href="${fileWithKey}"` : `href="javascript:void(0)" onclick="window.showProPromoModal()"`;
                
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

        // --------------------------------------------------------------------
        // 7. ИНИЦИАЛИЗАЦИЯ
        // --------------------------------------------------------------------
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
