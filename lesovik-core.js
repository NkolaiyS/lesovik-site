/**
 * ============================================================================
 * ЛЕСОВИК-CORE (lesovik-core.js)
 * Центральное ядро экосистемы «Лесовик PRO»
 * Разработка и автоматизация для таксации и отвода лесосек
 * ============================================================================
 * Версия: 2.0 (Мульти-проектная, со сквозной синхронизацией)
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
        SYSTEM_MODE: 'lesovik_system_mode_enabled', // true - В связке, false - Автономно
        GLOBAL_SETTINGS: 'lesovik_global_settings'
    };

    // Список модулей системы
    const SYSTEM_MODULES = [
        { id: 'busol', name: 'Буссоль PRO', file: 'busol-pro.html', icon: '🧭' },
        { id: 'height', name: 'Высотомер', file: 'height.html', icon: '📏' },
        { id: 'diameter', name: 'Мерная вилка', file: 'diameter.html', icon: '🌲' },
        { id: 'bitterlich', name: 'Полнотомер', file: 'bitterlich.html', icon: '👁️' },
        { id: 'journal', name: 'Перечетка', file: 'journal.html', icon: '📋' },
        { id: 'mdo', name: 'МДО и Смета', file: 'mdo.html', icon: '📊' }
    ];

    // ------------------------------------------------------------------------
    // 2. ИНИЦИАЛИЗАЦИЯ И МЕНЕДЖЕР ПРОЕКТОВ (ПАСПОРТ ДЕЛЯНКИ)
    // ------------------------------------------------------------------------
    window.LesovikCore = {
        version: '2.0-PRO',

        /**
         * Проверка наличия и валидности PRO-лицензии
         * @returns {boolean}
         */
        isPro: function () {
            const license = localStorage.getItem(STORAGE_KEYS.PRO_LICENSE);
            if (!license) return false;
            // Простейшая проверка структуры/хеша ключа (расширяемо под ваш сервер)
            return license.trim().length >= 8;
        },

        /**
         * Проверка, включен ли режим сквозной связки ("Системный режим")
         * @returns {boolean}
         */
        isSystemMode: function () {
            if (!this.isPro()) return false; // Бесплатная версия всегда работает АВТОНОМНО
            const savedMode = localStorage.getItem(STORAGE_KEYS.SYSTEM_MODE);
            return savedMode === null ? true : JSON.parse(savedMode); // По умолчанию для PRO включен
        },

        /**
         * Переключение режима (Автономно <-> В связке)
         * @param {boolean} enabled 
         */
        setSystemMode: function (enabled) {
            if (!this.isPro()) {
                console.warn('Лесовик-Core: Переключение системного режима доступно только в PRO версии.');
                return false;
            }
            localStorage.setItem(STORAGE_KEYS.SYSTEM_MODE, JSON.stringify(!!enabled));
            window.dispatchEvent(new CustomEvent('lesovik:mode_changed', { detail: { systemMode: !!enabled } }));
            location.reload(); // Перезагружаем страницу для корректного перестроения интерфейса
        },

        /**
         * Получение списка всех проектов из локальной базы
         * @returns {Array}
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
         * Сохранение базы проектов в localStorage
         * @param {Array} projects 
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
         * @returns {string|null}
         */
        getActiveProjectId: function () {
            return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
        },

        /**
         * Установить активный проект
         * @param {string} projectId 
         */
        setActiveProject: function (projectId) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, projectId);
            window.dispatchEvent(new CustomEvent('lesovik:project_changed', { detail: { projectId } }));
        },

        /**
         * Получить полные данные активного проекта
         * @returns {Object|null}
         */
        getActiveProject: function () {
            const projects = this.getProjects();
            const activeId = this.getActiveProjectId();
            if (!activeId && projects.length > 0) {
                // Если не выбран, берем первый доступный
                this.setActiveProject(projects[0].id);
                return projects[0];
            }
            return projects.find(p => p.id === activeId) || null;
        },

        /**
         * Создать новый проект (Паспорт делянки)
         * @param {Object} metaData Данные лесничества, квартала, делянки
         * @returns {Object} Новый проект
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
                // Список выделов/участков в рамках одной делянки
                plots: metaData.plots || [
                    this.generateEmptyPlot('Выдел 6', 6.32),
                    this.generateEmptyPlot('Выдел 12', 4.50),
                    this.generateEmptyPlot('Выдел 32', 2.18)
                ]
            };

            projects.unshift(newProject);
            this.saveProjectsDB(projects);
            this.setActiveProject(newProject.id);
            return newProject;
        },

        /**
         * Генератор структуры пустого участка/выдела
         * @param {string} name Название/номер выдела
         * @param {number} area Площадь в га
         */
        generateEmptyPlot: function (name, area) {
            return {
                id: 'plot_' + Math.random().toString(36).substr(2, 9),
                name: name || 'Выдел 1',
                area: area || 1.0,
                gis: {
                    points: [], // Координаты и азимуты из Буссоли
                    perimeter: 0,
                    kmlData: null
                },
                speciesData: {
                    // Данные по породам (Сосна, Ель, Береза и т.д.)
                    // Пример: 'Сосна': { avgHeight: 26.5, avgDiameter: 28, basalArea: 22, tally: {} }
                }
            };
        },

        /**
         * Обновить данные конкретного выдела в активном проекте
         * @param {string} plotId ID выдела
         * @param {string} moduleKey Название модуля (busol, height, diameter, bitterlich, journal, mdo)
         * @param {Object} payload Передаваемые данные
         */
        updatePlotModuleData: function (plotId, moduleKey, payload) {
            if (!this.isSystemMode()) {
                console.log('Лесовик-Core: Автономный режим. Данные не синхронизируются в базу проекта.');
                return;
            }

            const projects = this.getProjects();
            const activeId = this.getActiveProjectId();
            const projectIndex = projects.findIndex(p => p.id === activeId);

            if (projectIndex === -1) return;

            const plotIndex = projects[projectIndex].plots.findIndex(pl => pl.id === plotId);
            if (plotIndex === -1) return;

            // Интеграция данных от конкретного модуля
            const plot = projects[projectIndex].plots[plotIndex];
            plot.updated = new Date().toISOString();

            if (moduleKey === 'busol') {
                plot.gis = { ...plot.gis, ...payload };
                if (payload.area) plot.area = payload.area;
            } else if (['height', 'diameter', 'bitterlich', 'journal'].includes(moduleKey)) {
                // Запись и объединение показателей пород
                if (!plot.speciesData) plot.speciesData = {};
                if (payload.speciesName) {
                    const sp = payload.speciesName;
                    plot.speciesData[sp] = {
                        ...(plot.speciesData[sp] || {}),
                        ...payload.data
                    };
                } else if (payload.allSpeciesData) {
                    plot.speciesData = { ...plot.speciesData, ...payload.allSpeciesData };
                }
            }

            projects[projectIndex].updated = new Date().toISOString();
            this.saveProjectsDB(projects);
            console.log(`Лесовик-Core: Данные модуля [${moduleKey}] успешно синхронизированы для выдела [${plot.name}]`);
        },

        // --------------------------------------------------------------------
        // 3. АД-БЛОКЕР И ОЧИСТКА ИНТЕРФЕЙСА ДЛЯ PRO
        // --------------------------------------------------------------------
        suppressAds: function () {
            if (!this.isPro()) return;

            // Подавление рекламных контейнеров Яндекс РСЯ
            const adStyles = document.createElement('style');
            adStyles.id = 'lesovik-pro-ad-blocker';
            adStyles.innerHTML = `
                [id^="yandex_rtb"], 
                .ya-share2, 
                .rsya-block, 
                .ad-container, 
                div[class*="yandex"] { 
                    display: none !important; 
                    height: 0 !important; 
                    opacity: 0 !important; 
                    pointer-events: none !important; 
                }
            `;
            if (!document.getElementById('lesovik-pro-ad-blocker')) {
                document.head.appendChild(adStyles);
            }
        },

        // --------------------------------------------------------------------
        // 4. ОТРЕСОВКА ОБЩЕЙ НАВИГАЦИИ И ПАНЕЛИ СИНХРОНИЗАЦИИ
        // --------------------------------------------------------------------
        renderSystemHeader: function () {
            const container = document.getElementById('lesovik-core-header');
            if (!container) return;

            const isPro = this.isPro();
            const isSystemMode = this.isSystemMode();
            const activeProject = this.getActiveProject();
            const currentFile = window.location.pathname.split('/').pop() || 'index.html';

            let html = `
                <div class="lesovik-header-wrapper" style="background:#1e252b; color:#fff; padding:10px 15px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; border-bottom:2px solid #2e3b44;">
                    <div style="display:flex; justify-space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <!-- Левая часть: Статус лицензии и Выбор режима -->
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span style="font-weight:bold; font-size:16px; color:#4caf50;">🌲 ЛЕСОВИК ${isPro ? '<span style="background:#4caf50; color:#fff; padding:2px 6px; border-radius:4px; font-size:11px;">PRO</span>' : '<span style="background:#888; color:#fff; padding:2px 6px; border-radius:4px; font-size:11px;">FREE</span>'}</span>
                            
                            ${isPro ? `
                                <label style="display:inline-flex; align-items:center; cursor:pointer; font-size:13px; background:#2c3842; padding:4px 10px; border-radius:15px; border:1px solid #3d4d5a;">
                                    <input type="checkbox" id="lesovik-mode-toggle" ${isSystemMode ? 'checked' : ''} style="margin-right:6px;">
                                    <span>${isSystemMode ? '🔗 Режим: В связке (Системный)' : '⚡ Режим: Автономный замер'}</span>
                                </label>
                            ` : `
                                <span style="font-size:12px; color:#aaa;">(Режим: Автономные калькуляторы)</span>
                            `}
                        </div>

                        <!-- Правая часть: Выбор активной делянки/квартала -->
                        ${(isPro && isSystemMode && activeProject) ? `
                            <div style="display:flex; align-items:center; gap:10px; font-size:13px;">
                                <span style="color:#81c784;">📂 Делянка:</span>
                                <select id="lesovik-project-select" style="background:#2c3842; color:#fff; border:1px solid #455a64; padding:4px 8px; border-radius:4px;">
                                    ${this.getProjects().map(p => `
                                        <option value="${p.id}" ${p.id === activeProject.id ? 'selected' : ''}>
                                            ${p.passport.lesnichestvo} | Кв.${p.passport.kvartal}, Д.${p.passport.delyanka}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Нижняя навигационная панель по 6 модулям -->
                    <div style="display:flex; gap:6px; margin-top:10px; overflow-x:auto; padding-bottom:4px;">
                        ${SYSTEM_MODULES.map(m => {
                            const isActive = currentFile === m.file;
                            return `
                                <a href="${m.file}" style="text-decoration:none; color:${isActive ? '#fff' : '#b0bec5'}; background:${isActive ? '#2e7d32' : '#263238'}; padding:6px 12px; border-radius:4px; font-size:12px; white-space:nowrap; display:flex; align-items:center; gap:4px; border:1px solid ${isActive ? '#4caf50' : '#37474f'};">
                                    <span>${m.icon}</span>
                                    <span>${m.name}</span>
                                </a>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            container.innerHTML = html;

            // Навешивание обработчиков событий
            const toggleBtn = document.getElementById('lesovik-mode-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('change', (e) => {
                    this.setSystemMode(e.target.checked);
                });
            }

            const projectSelect = document.getElementById('lesovik-project-select');
            if (projectSelect) {
                projectSelect.addEventListener('change', (e) => {
                    this.setActiveProject(e.target.value);
                    location.reload();
                });
            }
        },

        // --------------------------------------------------------------------
        // 5. ИНИЦИАЛИЗАЦИЯ ПРИ ZAGRUZKE СТРАНИЦЫ
        // --------------------------------------------------------------------
        init: function () {
            // Инициализация стартовой демо-базы, если баз нет
            if (this.getProjects().length === 0 && this.isPro()) {
                this.createProject({
                    lesnichestvo: 'Важгортское уч. лесничество',
                    kvartal: '312',
                    delyanka: '12',
                    target: 'Сплошная рубка'
                });
            }

            // Подавление рекламы если PRO
            this.suppressAds();

            // Автоматический рендеринг шапки при загрузке DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.renderSystemHeader());
            } else {
                this.renderSystemHeader();
            }
        }
    };

    // Запуск ядра
    window.LesovikCore.init();

})();
