import AsyncStorage from '@react-native-async-storage/async-storage';

// hsk5 verisindeki ID DEGISIKLIKLERININ goc tablosu (Faz 4 + Faz 6).
//
// Kelime id'leri KIMLIKTIR: `@hsk_user_stats` ve `@hsk_review_pool` kayitlari
// kelimeyi kopyalamaz, yalnizca id tasir ve kelimeyi id'den cozer
// (services/wordRepository). Veri tarafinda bir id'nin anlami degistiginde
// diskteki eski kayitlar sessizce BASKA bir kelimeyi gostermeye baslardi.
// Bu dosya o gecislerin TEK kaydidir.
//
// ---------------------------------------------------------------------------
// FAZ 4: hsk5'teki IKIZ KAYITLAR
// ---------------------------------------------------------------------------
// `data/hsk5.json` icinde 17 kelime AYNI hanzi + AYNI pinyin ile iki kez
// bulunuyordu (iki farkli ice aktarim; anlam metinleri farkliydi). Her cift TEK
// kayda indirildi: KUCUK id korundu, anlam metni daha aciklayici olandan secildi.
// Silinen (buyuk) id'ler veride artik yoktu; tablo o id'lerdeki ilerlemeyi tutulan
// id'ye tasir (seriler TOPLANIR, bkz. statsManager.mergeWordStatsIds).
//
// ---------------------------------------------------------------------------
// FAZ 6: HSK5 LISTESININ RESMI 1300 KELIMEYLE DEGISTIRILMESI
// ---------------------------------------------------------------------------
// Faz 6 oncesi hsk5 dosyasi resmi listeyle yalnizca ilk 601 kelimede ortusuyordu:
// id 1802-2500 arasindaki 682 kelimenin 555'i ASLINDA HSK 6 kelimesiydi, 61'i
// HSK5'in sonundaki (z) kelimelerdi, 66'si hicbir resmi listede yoktu. Dosya,
// resmi Hanban 2012 HSK5 listesinin (1300 kelime) aynisi ile degistirildi; boylece
// Faz 4'te bosalan 17 id de gercek kelimelerle doldu.
// id 1201-1801'deki kelimeler AYNEN korundu; yalnizca 1802-2500 degisti.
//
// Kullanici ilerlemesi soyle tasinir (App.js'ten cagrilir):
//   @hsk_user_stats  -> `statsManager.mergeWordStatsIds(WORD_ID_MIGRATIONS)`
//                       + `statsManager.removeWordStatsByIds(HSK5_REBALANCE_DROPPED_IDS)`
//   @hsk_review_pool -> `reviewPool.normalizeReviewPool(pool, WORD_ID_MIGRATIONS)`
//                       (hedefi olmayan kayitlar cozulemez ve duser)
//
// HER IKI GOC DE TEK SEFERDIR (asagidaki surum isareti): Faz 6'dan sonra id
// 1802-2500 yeniden CANLI kelime tutar; tablo ikinci kez uygulanirsa yeni
// ilerleme yanlis kelimeye tasinirdi. Uygulanmis surum diskte tutulur ve goc
// yalnizca surum eskiyse calisir.
//
// Tabloyu DEGISTIRMEK gerekirse: hedef id `wordRepository` verisinde gercekten
// bulunmali (test dogrular) ve testler birlikte guncellenmelidir.

// Silinen id → tutulan id (Faz 4)
export const MERGED_WORD_ID_MAP = {
  1889: 1206, // 包含 bāohán
  1894: 1207, // 宝贵 bǎoguì
  2002: 1237, // 财产 cáichǎn
  2010: 1241, // 操场 cāochǎng
  2024: 1242, // 插 chā
  2021: 1243, // 叉子 chāzi
  2025: 1244, // 拆 chāi
  2110: 1275, // 传染 chuánrǎn
  2132: 1280, // 次要 cìyào
  2151: 1288, // 打工 dǎgōng
  2288: 1326, // 罚款 fákuǎn
  2293: 1328, // 繁荣 fánróng
  2310: 1333, // 方案 fāng'àn
  2331: 1545, // 培养 péiyǎng
  2380: 1556, // 期待 qīdài
  2431: 1571, // 亲切 qīnqiè
  2454: 1579, // 权力 quánlì
};

// --- Faz 6: hsk5 listesi resmi 1300 kelimelik listeyle degistirildi -------------
//
// Eski kuyruk (id 1802-2500) uygulamanin HSK5 dosyasinda YANLIS kelimeler tasiyordu
// (555'i HSK6 kelimesi, 61'i HSK5'in z-sonundaki kelime, 66'si hicbir resmi listede
// yok). Faz 6'da o aralik resmi HSK5 listesinin 602-1300. satirlariyla dolduruldu.
//
// Bu tablo, DEGISEN id'lerdeki kullanici ilerlemesini dogru kelimeye tasir:
//   deger > 2500  -> kelime HSK 6 listesinde yasiyor (oradan devam eder)
//   deger <= 2500 -> kelime HSK 5 icinde kaldi, yalnizca id'si degisti
// Tablodaki her hedef id veride GERCEKTEN vardir (test dogrular).
export const HSK5_REBALANCE_ID_MAP = {
  1802: 4855, // 执行 -> HSK6
  1803: 2454, // 执照 -> HSK5
  1804: 2453, // 直 -> HSK5
  1805: 1802, // 指导 -> HSK5
  1806: 2455, // 指挥 -> HSK5
  1807: 2458, // 至今 -> HSK5
  1809: 2456, // 制度 -> HSK5
  1810: 1804, // 制造 -> HSK5
  1811: 2457, // 制作 -> HSK5
  1812: 2483, // 咨询 -> HSK5
  1813: 1826, // 姿势 -> HSK5
  1814: 1824, // 资格 -> HSK5
  1815: 2481, // 资金 -> HSK5
  1816: 1825, // 资料 -> HSK5
  1817: 2482, // 资源 -> HSK5
  1818: 1827, // 紫 -> HSK5
  1819: 2486, // 自豪 -> HSK5
  1820: 2488, // 自私 -> HSK5
  1822: 1830, // 自由 -> HSK5
  1823: 2489, // 自愿 -> HSK5
  1824: 2490, // 总裁 -> HSK5
  1825: 1833, // 总理 -> HSK5
  1826: 1834, // 总算 -> HSK5
  1828: 1835, // 总之 -> HSK5
  1829: 2494, // 阻止 -> HSK5
  1830: 2492, // 组 -> HSK5
  1831: 1837, // 组织 -> HSK5
  1832: 2493, // 组合 -> HSK5
  1833: 4987, // 祖国 -> HSK6
  1834: 4988, // 祖先 -> HSK6
  1835: 2495, // 醉 -> HSK5
  1836: 2496, // 最初 -> HSK5
  1837: 2497, // 尊敬 -> HSK5
  1838: 2498, // 遵守 -> HSK5
  1839: 2499, // 作品 -> HSK5
  1840: 2500, // 作为 -> HSK5
  1841: 1838, // 作文 -> HSK5
  1842: 2501, // 挨 -> HSK6
  1843: 2502, // 癌症 -> HSK6
  1844: 1840, // 爱护 -> HSK5
  1845: 1841, // 爱惜 -> HSK5
  1846: 2505, // 暧昧 -> HSK6
  1848: 2506, // 安宁 -> HSK6
  1849: 2507, // 安详 -> HSK6
  1850: 2508, // 安置 -> HSK6
  1853: 2509, // 暗示 -> HSK6
  1854: 2513, // 昂贵 -> HSK6
  1855: 2514, // 凹凸 -> HSK6
  1856: 2515, // 熬 -> HSK6
  1857: 2516, // 奥秘 -> HSK6
  1858: 2520, // 巴结 -> HSK6
  1859: 2517, // 扒 -> HSK6
  1860: 2518, // 疤 -> HSK6
  1861: 2521, // 拔苗助长 -> HSK6
  1862: 2522, // 把关 -> HSK6
  1863: 2523, // 把手 -> HSK6
  1865: 2524, // 霸道 -> HSK6
  1866: 2525, // 罢工 -> HSK6
  1867: 2526, // 掰 -> HSK6
  1870: 2527, // 摆脱 -> HSK6
  1871: 2528, // 拜访 -> HSK6
  1872: 2529, // 拜年 -> HSK6
  1873: 2530, // 拜托 -> HSK6
  1874: 2534, // 颁发 -> HSK6
  1875: 2532, // 斑 -> HSK6
  1877: 2535, // 版本 -> HSK6
  1878: 2536, // 半途而废 -> HSK6
  1880: 2537, // 伴侣 -> HSK6
  1881: 2538, // 伴随 -> HSK6
  1882: 2539, // 扮演 -> HSK6
  1883: 2540, // 绑架 -> HSK6
  1884: 2541, // 榜样 -> HSK6
  1885: 2542, // 磅 -> HSK6
  1886: 2543, // 包庇 -> HSK6
  1887: 2544, // 包袱 -> HSK6
  1888: 1848, // 包裹 -> HSK5
  1890: 2545, // 包围 -> HSK6
  1891: 2546, // 包装 -> HSK6
  1893: 1851, // 宝贝 -> HSK5
  1896: 2555, // 保障 -> HSK6
  1897: 2556, // 保重 -> HSK6
  1898: 2558, // 报仇 -> HSK6
  1899: 2560, // 报答 -> HSK6
  1900: 2563, // 报销 -> HSK6
  1901: 2557, // 抱负 -> HSK6
  1902: 2567, // 暴力 -> HSK6
  1903: 2568, // 暴露 -> HSK6
  1904: 2564, // 爆发 -> HSK6
  1905: 2565, // 爆炸 -> HSK6
  1906: 2569, // 悲哀 -> HSK6
  1907: 2570, // 悲惨 -> HSK6
  1908: 2571, // 卑鄙 -> HSK6
  1910: 2575, // 背叛 -> HSK6
  1911: 2576, // 背诵 -> HSK6
  1912: 2573, // 被动 -> HSK6
  1913: 2580, // 奔波 -> HSK6
  1914: 2581, // 奔驰 -> HSK6
  1915: 2582, // 本能 -> HSK6
  1916: 2583, // 本钱 -> HSK6
  1917: 2584, // 本人 -> HSK6
  1918: 2585, // 本身 -> HSK6
  1919: 2587, // 笨拙 -> HSK6
  1920: 2588, // 崩溃 -> HSK6
  1921: 2589, // 甭 -> HSK6
  1922: 2590, // 蹦 -> HSK6
  1923: 2591, // 迸发 -> HSK6
  1924: 2592, // 逼迫 -> HSK6
  1926: 2596, // 比重 -> HSK6
  1927: 2597, // 鄙视 -> HSK6
  1928: 2601, // 闭塞 -> HSK6
  1929: 2600, // 弊端 -> HSK6
  1930: 2598, // 臂 -> HSK6
  1931: 2604, // 边疆 -> HSK6
  1932: 2605, // 边界 -> HSK6
  1933: 2606, // 边境 -> HSK6
  1934: 2607, // 边缘 -> HSK6
  1935: 2603, // 编织 -> HSK6
  1936: 2602, // 鞭策 -> HSK6
  1937: 2609, // 贬低 -> HSK6
  1938: 2610, // 贬义 -> HSK6
  1939: 2608, // 扁 -> HSK6
  1940: 2615, // 变故 -> HSK6
  1941: 2616, // 变迁 -> HSK6
  1942: 2617, // 变质 -> HSK6
  1943: 2612, // 便利 -> HSK6
  1944: 2613, // 便条 -> HSK6
  1945: 2611, // 遍布 -> HSK6
  1946: 2619, // 辩解 -> HSK6
  1947: 2618, // 辩护 -> HSK6
  1948: 2620, // 辩证 -> HSK6
  1949: 2621, // 辨认 -> HSK6
  1950: 2622, // 辫子 -> HSK6
  1951: 2623, // 标本 -> HSK6
  1952: 2624, // 标记 -> HSK6
  1953: 2625, // 标题 -> HSK6
  1954: 2628, // 表彰 -> HSK6
  1955: 2629, // 憋 -> HSK6
  1956: 2630, // 别墅 -> HSK6
  1957: 2631, // 别致 -> HSK6
  1958: 2632, // 别扭 -> HSK6
  1959: 2633, // 濒临 -> HSK6
  1960: 2634, // 冰雹 -> HSK6
  1961: 2635, // 丙 -> HSK6
  1964: 2636, // 并非 -> HSK6
  1966: 2638, // 拨 -> HSK6
  1967: 2640, // 波浪 -> HSK6
  1968: 2641, // 波涛 -> HSK6
  1969: 2642, // 剥削 -> HSK6
  1970: 2639, // 播种 -> HSK6
  1971: 2643, // 博大精深 -> HSK6
  1972: 2644, // 博览会 -> HSK6
  1973: 2645, // 搏斗 -> HSK6
  1974: 2647, // 薄弱 -> HSK6
  1975: 2653, // 补偿 -> HSK6
  1976: 2654, // 补救 -> HSK6
  1977: 2655, // 补贴 -> HSK6
  1979: 2656, // 哺乳 -> HSK6
  1981: 2658, // 不得已 -> HSK6
  1982: 2659, // 不妨 -> HSK6
  1983: 2660, // 不敢当 -> HSK6
  1986: 2649, // 不愧 -> HSK6
  1988: 2664, // 不免 -> HSK6
  1989: 2665, // 不时 -> HSK6
  1990: 2666, // 不惜 -> HSK6
  1991: 2652, // 不屑一顾 -> HSK6
  1993: 2669, // 不由得 -> HSK6
  1994: 2670, // 不择手段 -> HSK6
  1995: 2671, // 不止 -> HSK6
  1996: 2672, // 布告 -> HSK6
  1997: 2673, // 布局 -> HSK6
  1998: 2674, // 布置 -> HSK6
  1999: 2675, // 步伐 -> HSK6
  2000: 1874, // 步骤 -> HSK5
  2003: 2683, // 裁判 -> HSK6
  2004: 2685, // 采购 -> HSK6
  2005: 2688, // 彩票 -> HSK6
  2006: 2689, // 参谋 -> HSK6
  2007: 2691, // 残疾 -> HSK6
  2008: 2692, // 残酷 -> HSK6
  2009: 1878, // 惭愧 -> HSK5
  2011: 2700, // 操劳 -> HSK6
  2012: 2701, // 操练 -> HSK6
  2013: 1879, // 操心 -> HSK5
  2014: 1880, // 册 -> HSK5
  2015: 2707, // 策划 -> HSK6
  2016: 2709, // 测量 -> HSK6
  2017: 2708, // 策略 -> HSK6
  2019: 2711, // 层出不穷 -> HSK6
  2020: 2712, // 层次 -> HSK6
  2022: 2715, // 查获 -> HSK6
  2026: 2719, // 柴油 -> HSK6
  2027: 2720, // 搀 -> HSK6
  2028: 2721, // 馋 -> HSK6
  2029: 2722, // 缠绕 -> HSK6
  2030: 2723, // 产业 -> HSK6
  2031: 2724, // 阐述 -> HSK6
  2032: 2725, // 颤抖 -> HSK6
  2033: 2726, // 昌盛 -> HSK6
  2034: 2727, // 尝试 -> HSK6
  2035: 2728, // 偿还 -> HSK6
  2036: 2729, // 场合 -> HSK6
  2037: 2730, // 场面 -> HSK6
  2038: 2731, // 场所 -> HSK6
  2039: 2735, // 畅通 -> HSK6
  2040: 2736, // 畅销 -> HSK6
  2041: 2733, // 倡导 -> HSK6
  2042: 2734, // 倡议 -> HSK6
  2043: 2738, // 钞票 -> HSK6
  2044: 2737, // 超越 -> HSK6
  2045: 2742, // 巢穴 -> HSK6
  2046: 2739, // 朝代 -> HSK6
  2047: 2741, // 嘲笑 -> HSK6
  2048: 2740, // 潮流 -> HSK6
  2049: 2744, // 撤销 -> HSK6
  2050: 2745, // 沉淀 -> HSK6
  2051: 2746, // 沉闷 -> HSK6
  2052: 2747, // 沉思 -> HSK6
  2053: 2748, // 沉重 -> HSK6
  2054: 2749, // 沉着 -> HSK6
  2055: 2751, // 陈列 -> HSK6
  2056: 2750, // 陈旧 -> HSK6
  2057: 2752, // 陈述 -> HSK6
  2058: 2753, // 衬托 -> HSK6
  2059: 2754, // 称心如意 -> HSK6
  2060: 2755, // 称号 -> HSK6
  2061: 2763, // 成本 -> HSK6
  2062: 2764, // 成交 -> HSK6
  2063: 2765, // 成天 -> HSK6
  2064: 2766, // 成效 -> HSK6
  2066: 2770, // 诚挚 -> HSK6
  2067: 2759, // 承办 -> HSK6
  2068: 2760, // 承包 -> HSK6
  2069: 2761, // 承诺 -> HSK6
  2070: 2762, // 城堡 -> HSK6
  2071: 2758, // 乘 -> HSK6
  2072: 2756, // 盛 -> HSK6
  2073: 2769, // 惩罚 -> HSK6
  2074: 2771, // 澄清 -> HSK6
  2075: 2757, // 橙 -> HSK6
  2076: 2773, // 秤 -> HSK6
  2077: 2775, // 吃力 -> HSK6
  2078: 2777, // 迟缓 -> HSK6
  2079: 2778, // 迟疑 -> HSK6
  2080: 2779, // 持久 -> HSK6
  2081: 2781, // 赤字 -> HSK6
  2082: 2785, // 充当 -> HSK6
  2083: 2786, // 充沛 -> HSK6
  2084: 2787, // 充实 -> HSK6
  2085: 2784, // 冲突 -> HSK6
  2086: 2782, // 冲动 -> HSK6
  2088: 2792, // 重叠 -> HSK6
  2090: 2790, // 崇高 -> HSK6
  2091: 2789, // 崇拜 -> HSK6
  2092: 2794, // 稠密 -> HSK6
  2093: 2793, // 筹备 -> HSK6
  2094: 2795, // 丑恶 -> HSK6
  2096: 2796, // 出路 -> HSK6
  2097: 2797, // 出卖 -> HSK6
  2098: 2799, // 出神 -> HSK6
  2099: 2800, // 出息 -> HSK6
  2101: 2801, // 初步 -> HSK6
  2102: 2803, // 储备 -> HSK6
  2103: 2804, // 储存 -> HSK6
  2104: 2806, // 处分 -> HSK6
  2105: 2807, // 处境 -> HSK6
  2106: 2808, // 处置 -> HSK6
  2108: 2810, // 穿越 -> HSK6
  2111: 2815, // 传授 -> HSK6
  2113: 2812, // 船舶 -> HSK6
  2114: 2816, // 喘气 -> HSK6
  2115: 2817, // 串 -> HSK6
  2116: 2818, // 床单 -> HSK6
  2118: 2820, // 创新 -> HSK6
  2119: 2821, // 创业 -> HSK6
  2120: 2822, // 创作 -> HSK6
  2121: 2823, // 吹牛 -> HSK6
  2122: 2824, // 吹捧 -> HSK6
  2124: 2827, // 垂直 -> HSK6
  2125: 2829, // 纯洁 -> HSK6
  2126: 1916, // 词汇 -> HSK5
  2127: 2831, // 慈祥 -> HSK6
  2128: 2833, // 雌雄 -> HSK6
  2129: 2834, // 刺 -> HSK6
  2130: 1918, // 刺激 -> HSK5
  2131: 2836, // 次序 -> HSK6
  2133: 2838, // 丛 -> HSK6
  2134: 2839, // 从容 -> HSK6
  2135: 2840, // 凑合 -> HSK6
  2136: 2841, // 粗鲁 -> HSK6
  2137: 2842, // 窜 -> HSK6
  2138: 2843, // 摧残 -> HSK6
  2139: 2844, // 脆弱 -> HSK6
  2140: 2845, // 搓 -> HSK6
  2141: 2846, // 磋商 -> HSK6
  2142: 2847, // 挫折 -> HSK6
  2143: 2848, // 搭 -> HSK6
  2144: 2849, // 搭档 -> HSK6
  2145: 2850, // 搭配 -> HSK6
  2146: 2851, // 答辩 -> HSK6
  2147: 2852, // 答复 -> HSK6
  2148: 2853, // 达成 -> HSK6
  2149: 1925, // 达到 -> HSK5
  2150: 2854, // 打包 -> HSK6
  2152: 2857, // 打架 -> HSK6
  2153: 2858, // 打量 -> HSK6
  2154: 2859, // 打猎 -> HSK6
  2155: 2860, // 打仗 -> HSK6
  2157: 2864, // 大肆 -> HSK6
  2158: 2865, // 大体 -> HSK6
  2159: 2866, // 大意 -> HSK6
  2160: 1931, // 呆 -> HSK5
  2161: 2868, // 歹徒 -> HSK6
  2164: 2869, // 带领 -> HSK6
  2165: 2870, // 代价 -> HSK6
  2166: 2871, // 代理 -> HSK6
  2167: 2873, // 怠慢 -> HSK6
  2168: 2872, // 逮捕 -> HSK6
  2169: 2874, // 担保 -> HSK6
  2170: 2875, // 胆怯 -> HSK6
  2171: 2878, // 蛋白质 -> HSK6
  2172: 2879, // 诞辰 -> HSK6
  2173: 2880, // 诞生 -> HSK6
  2174: 2876, // 淡季 -> HSK6
  2175: 2877, // 淡水 -> HSK6
  2177: 2881, // 当场 -> HSK6
  2178: 2883, // 当代 -> HSK6
  2179: 2884, // 当面 -> HSK6
  2180: 2885, // 当前 -> HSK6
  2181: 2886, // 当事人 -> HSK6
  2182: 2887, // 当务之急 -> HSK6
  2183: 2888, // 当选 -> HSK6
  2184: 2889, // 党 -> HSK6
  2185: 2890, // 档案 -> HSK6
  2186: 2891, // 档次 -> HSK6
  2187: 2896, // 捣乱 -> HSK6
  2188: 2892, // 倒闭 -> HSK6
  2189: 2893, // 导弹 -> HSK6
  2190: 2894, // 导航 -> HSK6
  2191: 2895, // 导向 -> HSK6
  2192: 1941, // 岛屿 -> HSK5
  2195: 2897, // 稻谷 -> HSK6
  2196: 2899, // 得不偿失 -> HSK6
  2197: 2900, // 得力 -> HSK6
  2198: 2901, // 得天独厚 -> HSK6
  2199: 2902, // 得罪 -> HSK6
  2200: 2904, // 灯笼 -> HSK6
  2201: 2905, // 登陆 -> HSK6
  2202: 2906, // 登录 -> HSK6
  2203: 2908, // 等级 -> HSK6
  2205: 2916, // 地步 -> HSK6
  2206: 2917, // 地势 -> HSK6
  2207: 2918, // 地质 -> HSK6
  2208: 2919, // 颠簸 -> HSK6
  2209: 2920, // 颠倒 -> HSK6
  2210: 2922, // 典礼 -> HSK6
  2211: 2923, // 典型 -> HSK6
  2212: 2921, // 点缀 -> HSK6
  2213: 2924, // 垫 -> HSK6
  2214: 2926, // 奠定 -> HSK6
  2215: 2927, // 惦记 -> HSK6
  2217: 2929, // 雕刻 -> HSK6
  2218: 2930, // 雕塑 -> HSK6
  2219: 2931, // 吊 -> HSK6
  2220: 1954, // 钓 -> HSK5
  2221: 2932, // 调动 -> HSK6
  2222: 2933, // 跌 -> HSK6
  2223: 2936, // 叮嘱 -> HSK6
  2224: 2935, // 盯 -> HSK6
  2225: 2937, // 定期 -> HSK6
  2228: 2940, // 丢三落四 -> HSK6
  2229: 2941, // 东道主 -> HSK6
  2230: 2942, // 东张西望 -> HSK6
  2231: 2943, // 董事长 -> HSK6
  2232: 2946, // 动荡 -> HSK6
  2233: 2947, // 动机 -> HSK6
  2234: 2948, // 动静 -> HSK6
  2235: 2949, // 动力 -> HSK6
  2236: 2950, // 动脉 -> HSK6
  2238: 2954, // 动员 -> HSK6
  2239: 2945, // 冻结 -> HSK6
  2240: 2944, // 栋 -> HSK6
  2241: 2955, // 兜 -> HSK6
  2242: 2956, // 陡峭 -> HSK6
  2243: 2957, // 斗争 -> HSK6
  2244: 2958, // 督促 -> HSK6
  2245: 2960, // 毒品 -> HSK6
  2246: 2959, // 独裁 -> HSK6
  2247: 1957, // 独立 -> HSK5
  2248: 2962, // 堵塞 -> HSK6
  2249: 2961, // 赌博 -> HSK6
  2250: 2963, // 杜绝 -> HSK6
  2251: 2964, // 端 -> HSK6
  2252: 2965, // 端午节 -> HSK6
  2253: 2966, // 端正 -> HSK6
  2254: 2967, // 短促 -> HSK6
  2255: 2968, // 断定 -> HSK6
  2256: 2969, // 断绝 -> HSK6
  2257: 2970, // 堆积 -> HSK6
  2258: 2980, // 队伍 -> HSK6
  2259: 2971, // 对策 -> HSK6
  2260: 2975, // 对立 -> HSK6
  2261: 2976, // 对联 -> HSK6
  2262: 2977, // 对应 -> HSK6
  2263: 2978, // 对照 -> HSK6
  2264: 2979, // 兑现 -> HSK6
  2265: 1962, // 兑换 -> HSK5
  2266: 1963, // 蹲 -> HSK5
  2268: 2982, // 多元化 -> HSK6
  2269: 2983, // 哆嗦 -> HSK6
  2270: 2984, // 堕落 -> HSK6
  2271: 2985, // 额外 -> HSK6
  2272: 1966, // 恶劣 -> HSK5
  2273: 2988, // 遏制 -> HSK6
  2274: 2989, // 恩怨 -> HSK6
  2275: 2991, // 二氧化碳 -> HSK6
  2276: 2992, // 发布 -> HSK6
  2277: 2993, // 发财 -> HSK6
  2278: 2995, // 发动 -> HSK6
  2282: 2997, // 发射 -> HSK6
  2283: 2998, // 发誓 -> HSK6
  2284: 2999, // 发行 -> HSK6
  2285: 3000, // 发炎 -> HSK6
  2286: 3001, // 发扬 -> HSK6
  2287: 3002, // 发育 -> HSK6
  2290: 3003, // 法人 -> HSK6
  2291: 3004, // 番 -> HSK6
  2295: 3006, // 繁忙 -> HSK6
  2296: 3009, // 凡是 -> HSK6
  2297: 3010, // 反驳 -> HSK6
  2298: 3011, // 反常 -> HSK6
  2299: 3012, // 反感 -> HSK6
  2300: 3013, // 反抗 -> HSK6
  2301: 3014, // 反馈 -> HSK6
  2302: 3015, // 反面 -> HSK6
  2303: 3016, // 反射 -> HSK6
  2304: 3017, // 反思 -> HSK6
  2305: 3018, // 反问 -> HSK6
  2306: 3019, // 反之 -> HSK6
  2307: 3020, // 范畴 -> HSK6
  2308: 3022, // 贩卖 -> HSK6
  2309: 1974, // 方 -> HSK5
  2311: 3025, // 方圆 -> HSK6
  2312: 3026, // 方针 -> HSK6
  2313: 3027, // 防守 -> HSK6
  2314: 3028, // 防御 -> HSK6
  2315: 3029, // 防止 -> HSK6
  2316: 3030, // 防治 -> HSK6
  2317: 3031, // 访问 -> HSK6
  2318: 3032, // 纺织 -> HSK6
  2319: 3033, // 放大 -> HSK6
  2320: 3034, // 放射 -> HSK6
  2323: 3830, // 派别 -> HSK6
  2324: 3831, // 派遣 -> HSK6
  2325: 3832, // 攀登 -> HSK6
  2326: 3833, // 盘旋 -> HSK6
  2327: 3835, // 判决 -> HSK6
  2328: 2188, // 盼望 -> HSK5
  2329: 3836, // 庞大 -> HSK6
  2330: 3838, // 泡沫 -> HSK6
  2332: 2189, // 培训 -> HSK5
  2333: 3842, // 配套 -> HSK6
  2334: 2190, // 佩服 -> HSK5
  2335: 3843, // 盆地 -> HSK6
  2336: 3844, // 烹饪 -> HSK6
  2337: 3845, // 捧 -> HSK6
  2339: 2193, // 批 -> HSK5
  2340: 3847, // 批发 -> HSK6
  2341: 3848, // 批判 -> HSK6
  2342: 2194, // 批准 -> HSK5
  2343: 3849, // 疲惫 -> HSK6
  2344: 3850, // 疲倦 -> HSK6
  2346: 2196, // 匹 -> HSK5
  2347: 3852, // 屁股 -> HSK6
  2348: 3853, // 譬如 -> HSK6
  2349: 3854, // 偏差 -> HSK6
  2350: 3855, // 偏见 -> HSK6
  2351: 3856, // 偏僻 -> HSK6
  2352: 3857, // 偏偏 -> HSK6
  2353: 3859, // 片刻 -> HSK6
  2354: 3860, // 飘扬 -> HSK6
  2355: 3861, // 漂浮 -> HSK6
  2356: 3863, // 拼搏 -> HSK6
  2357: 3864, // 拼命 -> HSK6
  2358: 3865, // 频繁 -> HSK6
  2359: 3868, // 贫困 -> HSK6
  2360: 3867, // 贫乏 -> HSK6
  2361: 3866, // 频率 -> HSK6
  2362: 3870, // 品德 -> HSK6
  2363: 3871, // 品质 -> HSK6
  2364: 3872, // 品种 -> HSK6
  2365: 3873, // 平凡 -> HSK6
  2366: 2203, // 平衡 -> HSK5
  2367: 3877, // 平原 -> HSK6
  2368: 3879, // 评估 -> HSK6
  2369: 3880, // 评论 -> HSK6
  2370: 3881, // 屏障 -> HSK6
  2371: 3883, // 坡 -> HSK6
  2372: 3884, // 泼 -> HSK6
  2373: 3886, // 破例 -> HSK6
  2374: 3887, // 迫不及待 -> HSK6
  2375: 3888, // 迫害 -> HSK6
  2376: 3889, // 魄力 -> HSK6
  2377: 3890, // 扑 -> HSK6
  2378: 3891, // 铺 -> HSK6
  2379: 3894, // 朴素 -> HSK6
  2381: 3897, // 期限 -> HSK6
  2382: 3899, // 欺骗 -> HSK6
  2383: 3900, // 凄凉 -> HSK6
  2384: 3901, // 奇妙 -> HSK6
  2385: 3903, // 旗帜 -> HSK6
  2386: 3904, // 齐全 -> HSK6
  2387: 3905, // 齐心协力 -> HSK6
  2388: 3906, // 歧视 -> HSK6
  2389: 3917, // 乞丐 -> HSK6
  2390: 3918, // 企图 -> HSK6
  2391: 3913, // 启程 -> HSK6
  2392: 3915, // 启事 -> HSK6
  2393: 3914, // 启示 -> HSK6
  2394: 3907, // 起草 -> HSK6
  2395: 3909, // 起伏 -> HSK6
  2396: 3911, // 起码 -> HSK6
  2397: 3908, // 起初 -> HSK6
  2398: 3912, // 起源 -> HSK6
  2399: 3922, // 气概 -> HSK6
  2400: 3923, // 气功 -> HSK6
  2401: 3928, // 气象 -> HSK6
  2402: 3929, // 气压 -> HSK6
  2403: 3930, // 气质 -> HSK6
  2404: 3920, // 器材 -> HSK6
  2405: 3921, // 器官 -> HSK6
  2406: 3932, // 掐 -> HSK6
  2407: 3936, // 洽谈 -> HSK6
  2408: 3933, // 恰当 -> HSK6
  2409: 3935, // 恰巧 -> HSK6
  2410: 3937, // 牵 -> HSK6
  2411: 3938, // 牵扯 -> HSK6
  2412: 3939, // 牵制 -> HSK6
  2413: 3944, // 谦逊 -> HSK6
  2414: 3941, // 签署 -> HSK6
  2415: 3940, // 千方百计 -> HSK6
  2416: 3943, // 迁徙 -> HSK6
  2417: 3942, // 迁就 -> HSK6
  2418: 3945, // 前景 -> HSK6
  2419: 3946, // 前提 -> HSK6
  2420: 3947, // 潜力 -> HSK6
  2421: 3948, // 潜水 -> HSK6
  2422: 3949, // 潜移默化 -> HSK6
  2423: 3950, // 谴责 -> HSK6
  2425: 3956, // 翘 -> HSK6
  2426: 3959, // 切实 -> HSK6
  2427: 3958, // 锲而不舍 -> HSK6
  2428: 3964, // 钦佩 -> HSK6
  2429: 3962, // 侵犯 -> HSK6
  2430: 3961, // 亲热 -> HSK6
  2432: 3965, // 勤俭 -> HSK6
  2433: 3966, // 勤劳 -> HSK6
  2434: 3975, // 倾听 -> HSK6
  2435: 3976, // 倾向 -> HSK6
  2436: 3977, // 倾斜 -> HSK6
  2437: 3967, // 清澈 -> HSK6
  2438: 3970, // 清洁 -> HSK6
  2439: 3971, // 清理 -> HSK6
  2440: 3972, // 清晰 -> HSK6
  2441: 3974, // 清真 -> HSK6
  2442: 3981, // 情理 -> HSK6
  2443: 3980, // 情节 -> HSK6
  2444: 3982, // 情形 -> HSK6
  2445: 3978, // 晴朗 -> HSK6
  2446: 3989, // 区域 -> HSK6
  2447: 3991, // 曲折 -> HSK6
  2448: 3992, // 驱逐 -> HSK6
  2449: 3990, // 屈服 -> HSK6
  2450: 3993, // 渠道 -> HSK6
  2451: 3994, // 取缔 -> HSK6
  2452: 3995, // 曲子 -> HSK6
  2453: 4003, // 犬 -> HSK6
  2455: 2227, // 权利 -> HSK5
  2456: 4001, // 权威 -> HSK6
  2457: 3998, // 全局 -> HSK6
  2458: 3999, // 全力以赴 -> HSK6
  2459: 4002, // 拳头 -> HSK6
  2461: 4006, // 缺陷 -> HSK6
  2462: 4007, // 瘸 -> HSK6
  2463: 4008, // 确保 -> HSK6
  2464: 4009, // 确立 -> HSK6
  2465: 4011, // 确信 -> HSK6
  2466: 4012, // 群众 -> HSK6
  2467: 4013, // 染 -> HSK6
  2468: 4015, // 让步 -> HSK6
  2469: 4016, // 饶恕 -> HSK6
  2470: 4017, // 扰乱 -> HSK6
  2471: 4018, // 惹祸 -> HSK6
  2472: 4019, // 热泪盈眶 -> HSK6
  2473: 4020, // 热门 -> HSK6
  2474: 4022, // 人格 -> HSK6
  2475: 4023, // 人工 -> HSK6
  2476: 4024, // 人家 -> HSK6
  2477: 4026, // 人士 -> HSK6
  2480: 4028, // 人性 -> HSK6
  2482: 4030, // 仁慈 -> HSK6
  2483: 4031, // 忍耐 -> HSK6
  2484: 4032, // 忍受 -> HSK6
  2485: 4033, // 认定 -> HSK6
  2486: 4034, // 认可 -> HSK6
  2487: 4035, // 任命 -> HSK6
  2488: 4036, // 任性 -> HSK6
  2489: 4037, // 任意 -> HSK6
  2490: 4038, // 任重道远 -> HSK6
  2491: 4042, // 融化 -> HSK6
  2492: 4044, // 溶解 -> HSK6
  2493: 4043, // 融洽 -> HSK6
  2495: 4046, // 容纳 -> HSK6
  2496: 4047, // 容器 -> HSK6
  2497: 4048, // 容忍 -> HSK6
  2498: 4051, // 揉 -> HSK6
  2499: 4052, // 柔和 -> HSK6
};

// Kelime ne resmi HSK5 ne de HSK6 listesinde kaldi (yanlis kaynakli artiklar:
// istatistigi silinir, hata havuzu kaydi duser. Hedefi olmadigi icin MAP'te yer almaz.
export const HSK5_REBALANCE_DROPPED_IDS = [
  1808, // 至少
  1821, // 自信
  1827, // 总结
  1847, // 安居乐业
  1851, // 按期
  1852, // 暗杀
  1864, // 把戏
  1868, // 白白
  1869, // 百倍
  1876, // 搬迁
  1879, // 办法
  1892, // 饱满
  1895, // 保育员
  1909, // 北部
  1925, // 鼻梯
  1962, // 秉承
  1963, // 并存
  1965, // 并行
  1978, // 捕捞
  1980, // 不待
  1984, // 不均
  1985, // 堪
  1987, // 料
  1992, // 言而喻
  2001, // 部件
  2018, // 侧重
  2023, // 差异
  2065, // 真心实意
  2087, // 憧憬
  2089, // 重阳节
  2095, // 瞅
  2100, // 出洋相
  2107, // 穿梭
  2109, // 传递
  2112, // 船坞
  2117, // 创伤
  2123, // 垂
  2156, // 大包大揽
  2162, // 戴
  2163, // 带动
  2176, // 弹药
  2193, // 捣
  2194, // 祷告
  2204, // 提防
  2216, // 电线
  2226, // 定向
  2227, // 订正
  2237, // 动向
  2267, // 钝
  2279, // 发光
  2280, // 发火
  2281, // 发掘
  2289, // 法律
  2292, // 翻天覆地
  2294, // 繁重
  2321, // 放肆
  2322, // 拍卖
  2338, // 碰撞
  2345, // 脾气
  2424, // 撬
  2460, // 券
  2478, // 人人为我，我为人人
  2479, // 人生观
  2481, // 人造
  2494, // 荣耀
  2500, // 最终
];

// Iki tablonun birlikte uygulanmasi (yanlis havuzu tek haritayla tasinir).
// Anahtarlar ayriktir: MERGED_WORD_ID_MAP'in 17 id'si Faz 6'da bos DEGILDIR artik,
// ama bu tablonun anahtarlari yalnizca kelime tasiyan kuyruk id'leridir.
export const WORD_ID_MIGRATIONS = { ...MERGED_WORD_ID_MAP, ...HSK5_REBALANCE_ID_MAP };

// --- Uygulama surumu isareti (goc TEK SEFER calissin) ------------------------
//
// 1 = Faz 4 (ikiz kayitlarin birlestirilmesi, MERGED_WORD_ID_MAP)
// 2 = Faz 6 (hsk5 yeniden dengelendi, HSK5_REBALANCE_ID_MAP + DROPPED_IDS)
//
// Surum isareti, tablolarin hangi veri surumune gore uygulandigini tutar.
// Isaret yoksa (yeni kurulum ya da Faz 6 oncesi surum) goc bir kez uygulanir;
// boylece 9044490 oncesinden gelen kullanicinin ikiz kayit ilerlemesi de once
// dogru id'ye tasinir, sonra yeni dengelenmis id'ler canli kalir.
export const WORD_ID_MIGRATION_VERSION = 2;

// AsyncStorage anahtari. Ilerlemenin kendisi degil, YALNIZCA gocun uygulandigi
// surum tutulur (kucuk bir sayi).
export const WORD_ID_MIGRATION_VERSION_KEY = '@hsk_word_id_migration_version';

// Diskte yazan surum. Okunamayan/tanimsiz deger 0 sayilir: goc yeniden calisir
// (gocler idempotent oldugu icin tasinacak kayit kalmazsa hicbir sey yazilmaz).
export const getAppliedWordIdMigrationVersion = async () => {
  try {
    const raw = await AsyncStorage.getItem(WORD_ID_MIGRATION_VERSION_KEY);
    const version = Number(raw);
    return Number.isFinite(version) && version > 0 ? version : 0;
  } catch (error) {
    console.error('id gocu surumu okunamadi:', error);
    return 0;
  }
};

// Uygulanmamis (veya eski) bir goc var mi?
export const needsWordIdMigrations = async () =>
  (await getAppliedWordIdMigrationVersion()) < WORD_ID_MIGRATION_VERSION;

// Goc uygulandiktan SONRA isaretlenir. Sirayla cagrilmalidir: once istatistikler
// ve yanlis havuzu tasinir, en son bu isaret yazilir.
export const markWordIdMigrationsApplied = async () => {
  try {
    await AsyncStorage.setItem(WORD_ID_MIGRATION_VERSION_KEY, String(WORD_ID_MIGRATION_VERSION));
  } catch (error) {
    console.error('id gocu surumu yazilamadi:', error);
  }
};
