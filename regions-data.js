/**
 * Лесовик ПРО • Классификатор субъектов Российской Федерации по федеральным округам
 * (c) 2026 ИП Худяков Николай Сергеевич. Все права защищены.
 */
window.LESOVIK_FED_DISTRICTS = [
    {
        name: "Северо-Западный федеральный округ",
        regions: [
            { code: "komi", name: "Республика Коми", file: "komi-data.js", active: true },
            { code: "arkhangelsk", name: "Архангельская область", file: "arkh-data.js", active: true },
            { code: "vologda", name: "Вологодская область", file: "vologda-data.js", active: false },
            { code: "karelia", name: "Республика Карелия", file: "karelia-data.js", active: false },
            { code: "leningrad", name: "Ленинградская область", file: "len-data.js", active: false },
            { code: "murmansk", name: "Мурманская область", file: "murmansk-data.js", active: false },
            { code: "novgorod", name: "Новгородская область", file: "novgorod-data.js", active: false },
            { code: "pskov", name: "Псковская область", file: "pskov-data.js", active: false },
            { code: "kaliningrad", name: "Калининградская область", file: "kaliningrad-data.js", active: false },
            { code: "nenets", name: "Ненецкий автономный округ", file: "nao-data.js", active: false },
            { code: "spb", name: "г. Санкт-Петербург", file: "spb-data.js", active: false }
        ]
    },
    {
        name: "Приволжский федеральный округ",
        regions: [
            { code: "kirov", name: "Кировская область", file: "kirov-data.js", active: true },
            { code: "perm", name: "Пермский край", file: "perm-data.js", active: false },
            { code: "bashkortostan", name: "Республика Башкортостан", file: "bash-data.js", active: false },
            { code: "tatarstan", name: "Республика Татарстан", file: "tatar-data.js", active: false },
            { code: "udmurtia", name: "Удмуртская Республика", file: "udm-data.js", active: false },
            { code: "mariel", name: "Республика Марий Эл", file: "mari-data.js", active: false },
            { code: "mordovia", name: "Республика Мордовия", file: "mordovia-data.js", active: false },
            { code: "chuvashia", name: "Чувашская Республика", file: "chuvashia-data.js", active: false },
            { code: "nizhny_novgorod", name: "Нижегородская область", file: "nnov-data.js", active: false },
            { code: "orenburg", name: "Оренбургская область", file: "orenburg-data.js", active: false },
            { code: "penza", name: "Пензенская область", file: "penza-data.js", active: false },
            { code: "samara", name: "Самарская область", file: "samara-data.js", active: false },
            { code: "saratov", name: "Саратовская область", file: "saratov-data.js", active: false },
            { code: "ulyanovsk", name: "Ульяновская область", file: "ulyanovsk-data.js", active: false }
        ]
    },
    {
        name: "Уральский федеральный округ",
        regions: [
            { code: "sverdlovsk", name: "Свердловская область", file: "sverdlovsk-data.js", active: false },
            { code: "tyumen", name: "Тюменская область", file: "tyumen-data.js", active: false },
            { code: "khanty", name: "Ханты-Мансийский АО - Югра", file: "hmao-data.js", active: false },
            { code: "yamal", name: "Ямало-Ненецкий АО", file: "yanao-data.js", active: false },
            { code: "chelyabinsk", name: "Челябинская область", file: "chelyabinsk-data.js", active: false },
            { code: "kurgan", name: "Курганская область", file: "kurgan-data.js", active: false }
        ]
    },
    {
        name: "Сибирский федеральный округ",
        regions: [
            { code: "krasnoyarsk", name: "Красноярский край", file: "krasnoyarsk-data.js", active: true },
            { code: "irkutsk", name: "Иркутская область", file: "irkutsk-data.js", active: true },
            { code: "tomsk", name: "Томская область", file: "tomsk-data.js", active: false },
            { code: "omsk", name: "Омская область", file: "omsk-data.js", active: false },
            { code: "novosibirsk", name: "Новосибирская область", file: "novosibirsk-data.js", active: false },
            { code: "kemerovo", name: "Кемеровская область - Кузбасс", file: "kemerovo-data.js", active: false },
            { code: "altai_krai", name: "Алтайский край", file: "altkrai-data.js", active: false },
            { code: "altai_rep", name: "Республика Алтай", file: "altrep-data.js", active: false },
            { code: "tyva", name: "Республика Тыва", file: "tyva-data.js", active: false },
            { code: "khakassia", name: "Республика Хакасия", file: "khakassia-data.js", active: false }
        ]
    },
    {
        name: "Дальневосточный федеральный округ",
        regions: [
            { code: "habarovsk", name: "Хабаровский край", file: "habarovsk-data.js", active: false },
            { code: "primorsky", name: "Приморский край", file: "prim-data.js", active: false },
            { code: "amur", name: "Амурская область", file: "amur-data.js", active: false },
            { code: "sakha", name: "Республика Саха (Якутия)", file: "yakutia-data.js", active: false },
            { code: "buryatia", name: "Республика Бурятия", file: "buryat-data.js", active: false },
            { code: "zabaikal", name: "Забайкальский край", file: "zab-data.js", active: false },
            { code: "kamchatka", name: "Камчатский край", file: "kamchatka-data.js", active: false },
            { code: "magadan", name: "Магаданская область", file: "magadan-data.js", active: false },
            { code: "sakhalin", name: "Сахалинская область", file: "sakhalin-data.js", active: false },
            { code: "jewish", name: "Еврейская автономная область", file: "eao-data.js", active: false },
            { code: "chukotka", name: "Чукотский автономный округ", file: "chukotka-data.js", active: false }
        ]
    },
    {
        name: "Центральный федеральный округ",
        regions: [
            { code: "kostroma", name: "Костромская область", file: "kostroma-data.js", active: false },
            { code: "yaroslavl", name: "Ярославская область", file: "yar-data.js", active: false },
            { code: "tver", name: "Тверская область", file: "tver-data.js", active: false },
            { code: "smolensk", name: "Смоленская область", file: "smolensk-data.js", active: false },
            { code: "bryansk", name: "Брянская область", file: "bryansk-data.js", active: false },
            { code: "vladimir", name: "Владимирская область", file: "vladimir-data.js", active: false },
            { code: "ivanovo", name: "Ивановская область", file: "ivanovo-data.js", active: false },
            { code: "kaluga", name: "Калужская область", file: "kaluga-data.js", active: false },
            { code: "moscow_obl", name: "Московская область", file: "mosobl-data.js", active: false },
            { code: "moscow_city", name: "г. Москва", file: "moscow-data.js", active: false },
            { code: "ryazan", name: "Рязанская область", file: "ryazan-data.js", active: false },
            { code: "tula", name: "Тульская область", file: "tula-data.js", active: false },
            { code: "oryol", name: "Орловская область", file: "oryol-data.js", active: false },
            { code: "kursk", name: "Курская область", file: "kursk-data.js", active: false },
            { code: "belgorod", name: "Белгородская область", file: "belgorod-data.js", active: false },
            { code: "voronezh", name: "Воронежская область", file: "voronezh-data.js", active: false },
            { code: "lipetsk", name: "Липецкая область", file: "lipetsk-data.js", active: false },
            { code: "tambov", name: "Тамбовская область", file: "tambov-data.js", active: false }
        ]
    },
    {
        name: "Южный федеральный округ",
        regions: [
            { code: "krasnodar", name: "Краснодарский край", file: "krasnodar-data.js", active: false },
            { code: "rostov", name: "Ростовская область", file: "rostov-data.js", active: false },
            { code: "volgograd", name: "Волгоградская область", file: "volgograd-data.js", active: false },
            { code: "astrakhan", name: "Астраханская область", file: "astrakhan-data.js", active: false },
            { code: "adygea", name: "Республика Адыгея", file: "adygea-data.js", active: false },
            { code: "kalmykia", name: "Республика Калмыкия", file: "kalmykia-data.js", active: false },
            { code: "crimea", name: "Республика Крым", file: "crimea-data.js", active: false },
            { code: "sevastopol", name: "г. Севастополь", file: "sevastopol-data.js", active: false }
        ]
    },
    {
        name: "Северо-Кавказский федеральный округ",
        regions: [
            { code: "stavropol", name: "Ставропольский край", file: "stavropol-data.js", active: false },
            { code: "dagestan", name: "Республика Дагестан", file: "dagestan-data.js", active: false },
            { code: "ingushetia", name: "Республика Ингушетия", file: "ingushetia-data.js", active: false },
            { code: "kabardino", name: "Кабардино-Балкарская Республика", file: "kbr-data.js", active: false },
            { code: "karachay", name: "Карачаево-Черкесская Республика", file: "kchr-data.js", active: false },
            { code: "ossetia", name: "Республика Северная Осетия - Алания", file: "alania-data.js", active: false },
            { code: "chechnya", name: "Чеченская Республика", file: "chechnya-data.js", active: false }
        ]
    },
    {
        name: "Новые субъекты Российской Федерации",
        regions: [
            { code: "dnr", name: "Донецкая Народная Республика", file: "dnr-data.js", active: false },
            { code: "lnr", name: "Луганская Народная Республика", file: "lnr-data.js", active: false },
            { code: "zaporozhye", name: "Запорожская область", file: "zaporozhye-data.js", active: false },
            { code: "kherson", name: "Херсонская область", file: "kherson-data.js", active: false }
        ]
    }
];

// Плоский список для быстрого доступа
window.LESOVIK_REGIONS = window.LESOVIK_FED_DISTRICTS.flatMap(d => d.regions);
