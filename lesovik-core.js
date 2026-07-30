/**
 * ============================================================================
 * ЛЕСОВИК-CORE (lesovik-core.js)
 * Центральное ядро экосистемы «Лесовик PRO»
 * Разработка и автоматизация для таксации и отвода лесосек
 * ============================================================================
 * Версия: 2.1 (С прилипающим нижним меню и сквозной синхронизацией)
 * Автор / Владелец: Николай
 * Экосистема: РЕСУРС (https://resurs-stretch.ru/)
 * ============================================================================
 */

(function () {
    'use strict';

    // ------------------------------------------------------------------------
    // 1. КОНСТАНТЫ И НАСТРОЙКИ СИСТЕМЫ
    // ------------------------------------------------------------------------
    const STORAGE_KEYS = {
        PRO_LICENSE: 'lesovik_pro_license_key',
        ACTIVE_PROJECT_ID: 'lesovik_active_project_id',
        PROJECTS_DB: 'lesovik_projects_database',
        SYSTEM_MODE: 'lesovik_system_mode_enabled' // true - В связке, false - Автономно
    };

    // Список 6 модулей системы
    const SYSTEM_MODULES = [
        { id: 'busol', name: 'Буссоль', file: 'busol-pro.html', icon: '🧭' },
        { id: 'height', name: 'Высотомер', file: 'height.html', icon: '📏' },
        { id: 'diameter', name: 'Вилка', file: 'diameter.html', icon: '🌲' },
        { id: 'bitterlich', name: 'Полнотомер', file: 'bitterlich.html', icon: '👁️' },
        { id: 'journal', name: 'Перечет', file: 'journal.html', icon: '📋' },
        { id: 'mdo', name: 'МДО и Смета', file: 'mdo.html', icon: '📊' }
    ];

    // ------------------------------------------------------------------------
    // 2. ИНИЦИАЛИЗАЦИЯ И МЕНЕДЖЕР ПРОЕКТОВ (ПАСПОРТ ДЕЛЯНКИ)
    // ------------------------------------------------------------------------
    window.LesovikCore = {
        version: '2.1-PRO',

        /**
         * Проверка наличия PRO-лицензии
         */
        isPro: function () {
            const license = localStorage.getItem(STORAGE_KEYS.PRO_LICENSE);
            if (!license) return false;
            return license.trim().length >= 8;
        },

        /**
         * Проверка режима сквозной связки ("Системный режим")
         */
        isSystemMode: function () {
            if (!this.isPro()) return false;
            const savedMode = localStorage.getItem(STORAGE_KEYS.SYSTEM_MODE);
            return savedMode === null ? true : JSON.parse(savedMode);
        },

        /**
         * Переключение режима (Автономно <-> В связке)
         */
        setSystemMode: function (enabled) {
            if (!this.isPro()) {
                console.warn('Лесовик-Core: Доступно только в PRO версии.');
                return false;
            }
            localStorage.setItem(STORAGE_KEYS.SYSTEM_MODE, JSON.stringify(!!enabled));
            window.dispatchEvent(new CustomEvent('lesovik:mode_changed', { detail: { systemMode: !!enabled } }));
            location.reload();
        },

        /**
         * Получение списка всех проектов из локальной базы
         */
        getProjects: function () {
            try {
                const data = localStorage.getItem(STORAGE_KEYS.PROJECTS_DB);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.error('Ошибка чтения базы проектов:', e);
                return [];
            }
        },

        /**
         * Сохранение базы проектов
         */
        saveProjectsDB: function (projects) {
            try {
                localStorage.setItem(STORAGE_KEYS.PROJECTS_DB, JSON.stringify(projects));
                window.dispatchEvent(new CustomEvent('lesovik:db_updated'));
            } catch (e) {
                console.error('Ошибка сохранения базы проектов:', e);
            }
        },

        /**
         * Получить ID текущего активного проекта
         */
        getActiveProjectId: function () {
            return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
        },

        /**
         * Установить активный проект
         */
        setActiveProject: function (projectId) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, projectId);
            window.dispatchEvent(new CustomEvent('lesovik:project_changed', { detail: { projectId } }));
        },

        /**
         * Получить данные активного проекта
         */
        getActiveProject: function () {
            const projects = this.getProjects();
            const activeId = this.getActiveProjectId();
            if (!activeId && projects.length > 0) {
                this.setActiveProject(projects[0].id);
                return projects[0];
            }
            return projects.find(p => p.id === activeId) || null;
        },

        /**
         * Создать новый проект
         */
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

        /**
         * Генератор структуры выдела
         */
        generateEmptyPlot: function (name, area) {
            return {
                id: 'plot_' + Math.random().toString(36).substr(2, 9),
                name: name || 'Выдел 1',
                area: area || 1.0,
                gis: { points: [], perimeter: 0, kmlData: null },
                speciesData: {}
            };
        },

        /**
         * Синхронизация данных от разных модулей
         */
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
        // 3. ПОДАВЛЕНИЕ РЕКЛАМЫ (РСЯ)
        // --------------------------------------------------------------------
        suppressAds: function () {
            if (!this.isPro()) return;
            const adStyles = document.createElement('style');
            adStyles.id = 'lesovik-pro-ad-blocker';
            adStyles.innerHTML = `
                [id^="yandex_rtb"], .ya-share2, .rsya-block, .ad-container, div[class*="yandex"] { 
                    display: none !important; height: 0 !important; opacity: 0 !important; pointer-events: none !important; 
                }
            `;
            if (!document.getElementById('lesovik-pro-ad-blocker')) {
                document.head.appendChild(adStyles);
            }
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

            // Добавляем отступ снизу для body, чтобы нижнее меню не перекрывало подвал
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
                const isActive = currentFile === m.file;
                return `
                    <a href="${m.file}" style="
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

            // 2. Встраиваем статус связки и выбор делянки в существующую шапку .glass-header
            const headerRight = document.querySelector('.glass-header .header-right');
            if (headerRight && !document.getElementById('lesovik-top-control-box')) {
                const controlBox = document.createElement('div');
                controlBox.id = 'lesovik-top-control-box';
                controlBox.style.cssText = 'display:flex; align-items:center; gap:8px; font-size:12px; margin-right:8px;';

                let html = '';
                if (isPro) {
                    html += `
                        <label style="display:inline-flex; align-items:center; cursor:pointer; background:rgba(45,90,39,0.15); padding:4px 8px; border-radius:6px; border:1px solid var(--forest-green); font-size:11px;">
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

                // Обработчики переключения
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

            this.suppressAds();

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.renderNavigationUI());
            } else {
                this.renderNavigationUI();
            }
        }
    };

    // Запуск ядра
    window.LesovikCore.init();

})();
