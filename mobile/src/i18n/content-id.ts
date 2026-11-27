/**
 * Bahasa Indonesia for the programme's own content: the lesson cards and their
 * points, and the four weeks' themes and challenges.
 *
 * That content lives in the database in English only (`lesson_cards`,
 * `lesson_points`, `weekly_challenges`), as the decks wrote it. Rather than add a
 * column to each table, the app carries the translation here, keyed by the exact
 * English text, and shows it when the athlete has picked Bahasa (see
 * `content.ts`). Text with no entry is shown as it is, so a card added later
 * reads in English rather than not at all. The citations, food names and product
 * names stay as they are. The badges have their Bahasa by code, in `id.ts`.
 *
 * Only what is shown is translated. What is saved -- the week's theme on a
 * check-in row, for one -- stays the English the tracker uses.
 *
 * These are the app's translations; neither the dietitian nor a native speaker
 * has read them yet. Every key is checked against the seeds by
 * `__tests__/content-id.test.ts`, so an edited card cannot silently lose its
 * translation.
 */
export const CONTENT_ID: Readonly<Record<string, string>> = {
  "Carbohydrates":
    "Karbohidrat",
  "Add one carb to every meal":
    "Tambahkan satu sumber karbohidrat di setiap makan",
  "Protein + Micronutrients":
    "Protein + Mikronutrien",
  "Add one protein source to every meal":
    "Tambahkan satu sumber protein di setiap makan",
  "Recovery: Sleep + Hydration":
    "Pemulihan: Tidur + Hidrasi",
  "Log urine colour every morning + pre-sleep recovery":
    "Catat warna urine setiap pagi + pemulihan sebelum tidur",
  "Integration & Game Day":
    "Integrasi & Hari Pertandingan",
  "Run the full morning protocol one day — 500mL water on waking, breakfast before training, check your urine colour":
    "Jalankan protokol pagi lengkap selama satu hari — 500 mL air saat bangun, sarapan sebelum latihan, cek warna urinemu",
  "Carbohydrates: Your Training Fuel":
    "Karbohidrat: Bahan Bakar Latihanmu",
  "Team sports are glycolytic. That means carbohydrates — not protein, not fat — are the primary fuel for sprints, tackles, jumps, and decisions. This week we cover why, how much, and where to find them in Jakarta.":
    "Olahraga tim bersifat glikolitik. Artinya karbohidrat — bukan protein, bukan lemak — adalah bahan bakar utama untuk sprint, tekel, lompatan, dan pengambilan keputusan. Minggu ini kita bahas alasannya, berapa banyak, dan di mana mendapatkannya di Jakarta.",
  "Why it matters":
    "Kenapa ini penting",
  "Of energy during team sports comes from carbohydrates":
    "Energi saat olahraga tim berasal dari karbohidrat",
  "Body weight loss from dehydration = 10% drop in sprint speed":
    "Berat badan hilang karena dehidrasi = kecepatan sprint turun 10%",
  "Per kg body weight needed on training days (ISSN guidelines)":
    "Per kg berat badan yang dibutuhkan di hari latihan (pedoman ISSN)",
  "Full game depletes glycogen by 80–90% without fuelling":
    "Satu pertandingan penuh menguras glikogen 80–90% tanpa asupan energi",
  "90 min":
    "90 menit",
  "The Biggest Myth in Teen Nutrition":
    "Mitos Terbesar dalam Gizi Remaja",
  "THE MYTH":
    "MITOSNYA",
  "\"Carbs make you fat. Athletes should eat mostly protein.\" This comes from adult weight-loss culture — it is not relevant for a growing athlete burning 1,500–2,000 kcal in training per day.":
    "\"Karbohidrat bikin gemuk. Atlet sebaiknya makan sebagian besar protein.\" Ini berasal dari budaya diet penurunan berat badan orang dewasa — tidak relevan untuk atlet yang sedang tumbuh dan membakar 1.500–2.000 kkal saat latihan setiap hari.",
  "THE FACT":
    "FAKTANYA",
  "Carbohydrates are stored as glycogen in your muscles and liver. Glycogen is the fuel that powers every sprint, jump, and change of direction in training. Without it, you slow down — not because you're unfit, but because you're unfuelled.":
    "Karbohidrat disimpan sebagai glikogen di otot dan hati. Glikogen adalah bahan bakar untuk setiap sprint, lompatan, dan perubahan arah saat latihan. Tanpanya, kamu melambat — bukan karena tidak bugar, tapi karena kurang bahan bakar.",
  "What Carbohydrates Actually Do":
    "Apa yang Sebenarnya Dilakukan Karbohidrat",
  "You Eat Carbs":
    "Kamu Makan Karbohidrat",
  "Digested to Glucose":
    "Dicerna Menjadi Glukosa",
  "Broken down in the small intestine":
    "Dipecah di usus halus",
  "Stored as Glycogen":
    "Disimpan sebagai Glikogen",
  "~400g in muscles, ~100g in liver":
    "~400 g di otot, ~100 g di hati",
  "Released During Training":
    "Dilepas Saat Latihan",
  "Powers sprints, tackles, jumps":
    "Menggerakkan sprint, tekel, lompatan",
  "Must Be Replaced":
    "Harus Diganti",
  "Post-training nutrition refills the tank":
    "Asupan setelah latihan mengisi ulang tangki",
  "What Happens to Glycogen During a Full Game":
    "Apa yang Terjadi pada Glikogen Selama Satu Pertandingan Penuh",
  "Kick-off (0 min)":
    "Kick-off (menit 0)",
  "Half-time (45 min)":
    "Turun minum (menit 45)",
  "75 minutes":
    "Menit 75",
  "Full time (90 min)":
    "Akhir pertandingan (menit 90)",
  "When to Eat Carbs Around Training":
    "Kapan Makan Karbohidrat di Sekitar Latihan",
  "PRE-TRAINING (1–2 HRS BEFORE)":
    "SEBELUM LATIHAN (1–2 JAM SEBELUMNYA)",
  "Goal: Top up glycogen stores before you deplete them.\n\nBest options: 1–2 pisang · roti gandum + selai kacang · ubi jalar rebus · oat dengan susu\n\nAvoid: Heavy or fatty food (slows digestion, causes stomach issues)":
    "Tujuan: Isi penuh cadangan glikogen sebelum terkuras.\n\nPilihan terbaik: 1–2 pisang · roti gandum + selai kacang · ubi jalar rebus · oat dengan susu\n\nHindari: Makanan berat atau berlemak (memperlambat pencernaan, bikin perut tidak nyaman)",
  "DURING TRAINING (>60 MIN SESSIONS)":
    "SAAT LATIHAN (SESI >60 MENIT)",
  "Goal: Maintain blood glucose and delay fatigue.\n\nBest options: 1 pisang at half-time · small sip of Pocari or air kelapa muda · orange/jeruk slices\n\nIf under 60 min: Water only — no food needed during session":
    "Tujuan: Menjaga gula darah dan menunda kelelahan.\n\nPilihan terbaik: 1 pisang saat jeda · seteguk kecil Pocari atau air kelapa muda · irisan jeruk\n\nJika kurang dari 60 menit: Cukup air — tidak perlu makan selama sesi",
  "POST-TRAINING (WITHIN 30 MIN)":
    "SETELAH LATIHAN (DALAM 30 MENIT)",
  "Goal: Replenish glycogen + start muscle repair. This is the most important window.\n\nBest options: 1–2 pisang + glass susu · nasi + ayam · roti + telur · jus semangka + telur rebus\n\nTarget ratio: 3:1 carbs to protein":
    "Tujuan: Mengisi ulang glikogen + memulai perbaikan otot. Ini waktu yang paling penting.\n\nPilihan terbaik: 1–2 pisang + segelas susu · nasi + ayam · roti + telur · jus semangka + telur rebus\n\nRasio target: 3:1 karbohidrat banding protein",
  "Your Carbohydrate Targets":
    "Target Karbohidratmu",
  "for 60–70 kg athlete":
    "untuk atlet 60–70 kg",
  "TRAINING DAY":
    "HARI LATIHAN",
  "5–7g per kg body weight · Most of this should come from nasi, ubi, pisang, roti":
    "5–7 g per kg berat badan · Sebagian besar sebaiknya dari nasi, ubi, pisang, roti",
  "REST DAY":
    "HARI ISTIRAHAT",
  "3–4g per kg body weight · Slightly reduced — muscle demand is lower":
    "3–4 g per kg berat badan · Sedikit dikurangi — kebutuhan otot lebih rendah",
  "GAME DAY":
    "HARI PERTANDINGAN",
  "6–8g per kg · High output day · Start loading the night before":
    "6–8 g per kg · Hari dengan kerja tinggi · Mulai isi dari malam sebelumnya",
  "CURRENT AVERAGE (LAB RATS)":
    "RATA-RATA SAAT INI (LAB RATS)",
  "This is 20–40% of target — the biggest performance gap we are addressing":
    "Ini baru 20–40% dari target — celah performa terbesar yang sedang kita perbaiki",
  "Best Carbohydrate Sources in Jakarta":
    "Sumber Karbohidrat Terbaik di Jakarta",
  "Add One Carb to Every Meal":
    "Tambahkan Satu Karbohidrat di Setiap Makan",
  "Don't change what you're eating — just add. If you're having chicken and salad for lunch, add a bowl of nasi. If you're skipping breakfast, have a pisang. If your pre-training meal has no carbs, add ubi jalar rebus or 2 slices roti. One addition per meal, three meals a day, every day this week. That's it. Track whether your energy in the second half of training feels different by Thursday.":
    "Tidak perlu mengubah apa yang kamu makan — cukup tambahkan. Kalau makan siangmu ayam dan salad, tambahkan semangkuk nasi. Kalau kamu melewatkan sarapan, makan pisang. Kalau makanan sebelum latihan tidak ada karbohidratnya, tambahkan ubi jalar rebus atau 2 lembar roti. Satu tambahan per makan, tiga kali makan sehari, setiap hari minggu ini. Itu saja. Perhatikan apakah energimu di paruh kedua latihan terasa berbeda sebelum hari Kamis.",
  "References":
    "Referensi",
  "Build. Repair. Repeat.":
    "Bangun. Perbaiki. Ulangi.",
  "You trained hard last week. Protein is what rebuilds what training breaks down. This week: learn how to actually use it.":
    "Kamu sudah berlatih keras minggu lalu. Protein yang membangun kembali apa yang dirusak latihan. Minggu ini: pelajari cara benar-benar memakainya.",
  "Per kg bodyweight needed daily for teen male athletes":
    "Per kg berat badan per hari untuk atlet remaja laki-laki",
  "Per meal to trigger muscle protein synthesis — the sweet spot":
    "Per makan untuk memicu sintesis protein otot — takaran idealnya",
  "Post-training window — muscles absorb protein fastest here":
    "Waktu setelah latihan — otot menyerap protein paling cepat di sini",
  "30 min":
    "30 menit",
  "This group's actual calorie intake vs what training demands":
    "Asupan kalori nyata kelompok ini dibanding kebutuhan latihan",
  "Before Protein — The Calorie Gap":
    "Sebelum Protein — Celah Kalori",
  "This is the group average: 50–65% of calorie needs met on training days. Protein distribution matters — but not if total intake is this low. Adding protein at breakfast doesn't just fix the macro split — it closes part of this gap.":
    "Ini rata-rata kelompok: hanya 50–65% kebutuhan kalori terpenuhi di hari latihan. Pembagian protein itu penting — tapi tidak banyak artinya kalau total asupannya serendah ini. Menambah protein saat sarapan bukan hanya memperbaiki pembagian makronutrien — tapi juga menutup sebagian celah ini.",
  "kcal the body needed to support training, repair, and growth":
    "kkal yang dibutuhkan tubuh untuk latihan, perbaikan, dan pertumbuhan",
  "Avg protein at dinner (most of the group)":
    "Rata-rata protein saat makan malam (sebagian besar kelompok)",
  "Protein at breakfast (most days)":
    "Protein saat sarapan (hampir setiap hari)",
  "The Biggest Myth in Protein":
    "Mitos Terbesar tentang Protein",
  "\"Eat as much protein as possible — more protein equals more muscle.\" This leads to piling 150g chicken at dinner, skipping breakfast entirely, and thinking the job is done.":
    "\"Makan protein sebanyak mungkin — makin banyak protein makin besar otot.\" Ini membuat orang menumpuk 150 g ayam saat makan malam, melewatkan sarapan sama sekali, dan merasa tugasnya sudah selesai.",
  "The body can only use 25–35g per meal for muscle protein synthesis. Above that, surplus amino acids are burned as fuel — not stored as muscle. The goal is better-timed protein across the day, not a bigger dinner.":
    "Tubuh hanya bisa memakai 25–35 g per makan untuk sintesis protein otot. Lebih dari itu, kelebihan asam amino dibakar sebagai energi — bukan disimpan sebagai otot. Tujuannya protein dengan waktu yang lebih tepat sepanjang hari, bukan makan malam yang lebih besar.",
  "What Protein Actually Does":
    "Apa yang Sebenarnya Dilakukan Protein",
  "The repair cycle runs 4 times a day - at every meal. Miss a meal = miss a repair window. Dinner only = 1 out of 4 windows used.":
    "Siklus perbaikan berjalan 4 kali sehari - di setiap makan. Lewatkan satu makan = lewatkan satu waktu perbaikan. Hanya makan malam = cuma 1 dari 4 waktu terpakai.",
  "You Train":
    "Kamu Berlatih",
  "Micro-tears form in muscle fibres — the stimulus for growth":
    "Robekan mikro terbentuk di serat otot — pemicu pertumbuhan",
  "Amino Acids Arrive":
    "Asam Amino Datang",
  "From digested protein within 30–90 min":
    "Dari protein yang dicerna dalam 30–90 menit",
  "Leucine Triggers mTOR":
    "Leusin Memicu mTOR",
  "2.5g leucine switches on the repair signal":
    "2,5 g leusin menyalakan sinyal perbaikan",
  "MPS Begins":
    "MPS Dimulai",
  "New protein strands built — stronger than before":
    "Untaian protein baru terbentuk — lebih kuat dari sebelumnya",
  "Recovery Complete":
    "Pemulihan Selesai",
  "Only if protein + carbs + sleep all present":
    "Hanya jika protein + karbohidrat + tidur semuanya ada",
  "The Problem Isn't How Much — It's When":
    "Masalahnya Bukan Berapa Banyak — Tapi Kapan",
  "CURRENT PATTERN (MOST OF THIS GROUP)":
    "POLA SAAT INI (SEBAGIAN BESAR KELOMPOK)",
  "Breakfast 0–10g\nLunch 20–30g\nDinner 60–90g ← everything here\nPost-Training 0g":
    "Sarapan 0–10 g\nMakan siang 20–30 g\nMakan malam 60–90 g ← semuanya di sini\nSetelah latihan 0 g",
  "OPTIMAL PATTERN":
    "POLA OPTIMAL",
  "Breakfast 25–35g ← morning MPS\nLunch 25–35g\nDinner 25–35g\nPost-Training 20–25g ← recovery window":
    "Sarapan 25–35 g ← MPS pagi\nMakan siang 25–35 g\nMakan malam 25–35 g\nSetelah latihan 20–25 g ← waktu pemulihan",
  "Protein Targets":
    "Target Protein",
  "DAILY TARGET":
    "TARGET HARIAN",
  "1.6–2.2g per kg · spread across 4 meals":
    "1,6–2,2 g per kg · dibagi ke 4 kali makan",
  "PER MEAL SWEET SPOT":
    "TAKARAN IDEAL PER MAKAN",
  "Above 35g per meal adds no extra MPS benefit":
    "Di atas 35 g per makan tidak menambah manfaat MPS",
  "POST-TRAINING":
    "SETELAH LATIHAN",
  "Within 30 min · pair with 3:1 carbs":
    "Dalam 30 menit · padukan dengan karbohidrat 3:1",
  "CURRENT GROUP RANGE":
    "RENTANG KELOMPOK SAAT INI",
  "Micronutrients — What Makes Protein Actually Work":
    "Mikronutrien — Yang Membuat Protein Benar-benar Bekerja",
  "Protein is the raw material. Micronutrients are the tools that convert it into muscle. Three are critically low in this group — and all three come from the same foods that fix the protein gap.":
    "Protein adalah bahan bakunya. Mikronutrien adalah alat yang mengubahnya menjadi otot. Tiga di antaranya sangat rendah di kelompok ini — dan ketiganya berasal dari makanan yang sama yang menutup celah protein.",
  "IRON — OXYGEN DELIVERY":
    "ZAT BESI — PENGANTAR OKSIGEN",
  "Makes haemoglobin. Without it, oxygen delivery to working muscles drops — you fatigue earlier in the second half regardless of fitness. Low iron reduces VO₂max by 15–20%.\n\nFix: tempe, bayam, kangkung, ikan teri — pair with jeruk for 2× absorption":
    "Membentuk hemoglobin. Tanpanya, pasokan oksigen ke otot yang bekerja menurun — kamu lebih cepat lelah di babak kedua, sebugar apa pun kamu. Zat besi rendah menurunkan VO₂max 15–20%.\n\nSolusi: tempe, bayam, kangkung, ikan teri — padukan dengan jeruk untuk penyerapan 2×",
  "ZINC — THE MPS SWITCH":
    "SENG — SAKELAR MPS",
  "Cofactor for ribosomal protein assembly and testosterone synthesis. Without zinc, the mTOR pathway that protein triggers cannot complete the repair cycle. Teen boys lose zinc fastest during intense training.\n\nFix: daging sapi, tempe, kacang mete, telur":
    "Kofaktor untuk perakitan protein di ribosom dan pembentukan testosteron. Tanpa seng, jalur mTOR yang dipicu protein tidak bisa menyelesaikan siklus perbaikan. Remaja laki-laki paling cepat kehilangan seng saat latihan intens.\n\nSolusi: daging sapi, tempe, kacang mete, telur",
  "OMEGA-3 — RECOVERY SIGNAL":
    "OMEGA-3 — SINYAL PEMULIHAN",
  "Reduces exercise-induced inflammation and improves the muscle's anabolic sensitivity to protein — the same protein dose produces more MPS when omega-3 status is adequate. Also improves decision-making during games.\n\nFix: ikan kembung, salmon, sarden — 2–3× per week":
    "Mengurangi peradangan akibat latihan dan meningkatkan kepekaan anabolik otot terhadap protein — dosis protein yang sama menghasilkan MPS lebih besar saat status omega-3 cukup. Juga membantu pengambilan keputusan saat pertandingan.\n\nSolusi: ikan kembung, salmon, sarden — 2–3× per minggu",
  "THE FOOD HACK":
    "TRIK MAKANAN",
  "Tempe, ikan kembung, and telur give you protein AND iron AND zinc AND omega-3. You don't need to think about micronutrients separately. Add those three foods and you cover the most critical gaps.":
    "Tempe, ikan kembung, dan telur memberimu protein DAN zat besi DAN seng DAN omega-3. Kamu tidak perlu memikirkan mikronutrien secara terpisah. Tambahkan tiga makanan itu dan celah paling penting sudah tertutup.",
  "Best Protein Sources in Jakarta":
    "Sumber Protein Terbaik di Jakarta",
  "Smart Combos — Complete Profile":
    "Kombinasi Cerdas — Profil Lengkap",
  "Post-training in a hurry? 2 telur rebus + 1 pisang = 18g protein + 27g carbs. Costs Rp 6,000. Takes 30 seconds. That's your recovery window covered.":
    "Buru-buru setelah latihan? 2 telur rebus + 1 pisang = 18 g protein + 27 g karbohidrat. Harganya Rp 6.000. Cuma 30 detik. Waktu pemulihanmu sudah terpenuhi.",
  "Complete amino acid profile":
    "Profil asam amino lengkap",
  "Leucine + lysine pair":
    "Pasangan leusin + lisin",
  "Best breakfast combination":
    "Kombinasi sarapan terbaik",
  "Post-training: protein + fast carbs":
    "Setelah latihan: protein + karbohidrat cepat",
  "One of Indonesia's most complete meals":
    "Salah satu makanan paling lengkap di Indonesia",
  "Add One Protein Source to Every Meal":
    "Tambahkan Satu Sumber Protein di Setiap Makan",
  "Don't change what you're already eating — just add. Lunch has rice and veg? Add tempe or a boiled egg. Dinner already has chicken? Keep it and add tahu. Post-training is nothing? Add a glass of susu or 2 telur rebus. One protein add per meal, every day, three meals minimum. At the end of each day, ask yourself: did I hit protein at 3 or more meals today? Track it and report Sunday.":
    "Tidak perlu mengubah apa yang sudah kamu makan — cukup tambahkan. Makan siang ada nasi dan sayur? Tambahkan tempe atau telur rebus. Makan malam sudah ada ayam? Pertahankan dan tambahkan tahu. Setelah latihan tidak makan apa-apa? Tambahkan segelas susu atau 2 telur rebus. Satu tambahan protein per makan, setiap hari, minimal tiga kali makan. Di akhir hari, tanya dirimu: apakah aku makan protein di 3 kali makan atau lebih hari ini? Catat dan laporkan hari Minggu.",
  "You've fixed the fuel. You've fixed the building blocks. Now fix the process that makes both of them work. Training creates the stimulus — sleep and hydration are where the adaptation actually happens.":
    "Kamu sudah memperbaiki bahan bakarnya. Kamu sudah memperbaiki bahan bangunannya. Sekarang perbaiki proses yang membuat keduanya bekerja. Latihan memberi rangsangan — tidur dan hidrasi adalah saat adaptasi benar-benar terjadi.",
  "Sleep needed for teen male athletes — AASM guideline":
    "Tidur yang dibutuhkan atlet remaja laki-laki — pedoman AASM",
  "Testosterone drop after one week at 6hrs sleep (Leproult, 2011)":
    "Penurunan testosteron setelah seminggu tidur 6 jam (Leproult, 2011)",
  "Body weight loss from sweat = 10% drop in sprint speed":
    "Berat badan hilang lewat keringat = kecepatan sprint turun 10%",
  "Sweat lost per hour in Jakarta heat vs 0.5L in temperate climates":
    "Keringat yang hilang per jam di panas Jakarta vs 0,5 L di iklim sedang",
  "Week 3 calorie thread":
    "Benang merah kalori minggu 3",
  "Dark urine after training usually means two deficits at once — fluid AND calories. If you trained hard and your urine is 5+ on the scale, check what you ate post-training too. Both matter. Recovery is not just about drinking more water.":
    "Urine gelap setelah latihan biasanya berarti dua kekurangan sekaligus — cairan DAN kalori. Kalau kamu latihan keras dan urinemu 5+ di skala, cek juga apa yang kamu makan setelah latihan. Keduanya penting. Pemulihan bukan hanya soal minum lebih banyak air.",
  "Sleep: The Anabolic Window":
    "Tidur: Waktu Anabolik",
  "Sleep is not passive downtime. It is when growth hormone, testosterone, and IGF-1 peak — when muscles repair and motor patterns from training get consolidated. Everything done in Week 1 and Week 2 only works if sleep closes the loop.":
    "Tidur bukan waktu diam yang pasif. Saat tidurlah hormon pertumbuhan, testosteron, dan IGF-1 mencapai puncaknya — saat otot diperbaiki dan pola gerak dari latihan dimantapkan. Semua yang dilakukan di Minggu 1 dan Minggu 2 hanya berhasil kalau tidur menutup siklusnya.",
  "GROWTH HORMONE (GH)":
    "HORMON PERTUMBUHAN (GH)",
  "Released in a large pulse during the first 1–2 hours of deep slow-wave sleep. Stimulates satellite cell activation and muscle repair. Teen male athletes produce 2–3× more GH during sleep than adults. Fragmented sleep cuts this pulse — a nap does not substitute for consolidated overnight sleep.":
    "Dilepas dalam satu lonjakan besar selama 1–2 jam pertama tidur nyenyak gelombang lambat. Merangsang aktivasi sel satelit dan perbaikan otot. Atlet remaja laki-laki menghasilkan GH 2–3× lebih banyak saat tidur dibanding orang dewasa. Tidur yang terputus-putus memotong lonjakan ini — tidur siang tidak bisa menggantikan tidur malam yang utuh.",
  "Released in response to GH. Directly activates the mTOR pathway — the same switch that dietary leucine triggers. Well-slept athletes have two simultaneous MPS signals: dietary protein AND overnight IGF-1. Cutting sleep removes one of them.":
    "Dilepas sebagai respons terhadap GH. Langsung mengaktifkan jalur mTOR — sakelar yang sama yang dipicu leusin dari makanan. Atlet yang cukup tidur punya dua sinyal MPS sekaligus: protein dari makanan DAN IGF-1 semalaman. Kurang tidur menghilangkan salah satunya.",
  "TESTOSTERONE":
    "TESTOSTERON",
  "Produced primarily during sleep. Teen males are at lifetime peak during puberty. One week of sleep restriction at 6hrs/night reduces testosterone by 10–15% in young men — equivalent to 10 years of ageing in anabolic hormone status. Consistently sleeping under 7 hours cuts production during the highest anabolic window of your life.":
    "Diproduksi terutama saat tidur. Remaja laki-laki berada di puncak seumur hidupnya selama pubertas. Satu minggu tidur hanya 6 jam/malam menurunkan testosteron 10–15% pada pria muda — setara dengan penuaan 10 tahun dalam status hormon anabolik. Rutin tidur kurang dari 7 jam memotong produksinya di masa anabolik tertinggi dalam hidupmu.",
  "CORTISOL — THE THREAT":
    "KORTISOL — ANCAMANNYA",
  "Sleep deprivation chronically elevates cortisol — the catabolic hormone that breaks muscle protein down for energy. It peaks in the morning and is lowest during sleep. Athletes sleeping 5–6 hours have elevated cortisol that partially offsets the night's repair work. Post-training carbs blunt cortisol by restoring blood glucose.":
    "Kurang tidur membuat kortisol terus tinggi — hormon katabolik yang memecah protein otot untuk energi. Kortisol memuncak di pagi hari dan paling rendah saat tidur. Atlet yang tidur 5–6 jam punya kortisol tinggi yang sebagian menghapus kerja perbaikan semalam. Karbohidrat setelah latihan meredam kortisol dengan memulihkan gula darah.",
  "Food and Sleep — The Tryptophan Pathway":
    "Makanan dan Tidur — Jalur Triptofan",
  "Eat Tryptophan":
    "Makan Triptofan",
  "Banana, warm milk, eggs, oats":
    "Pisang, susu hangat, telur, oat",
  "Crosses Blood-Brain Barrier":
    "Melewati Sawar Darah-Otak",
  "Carbs alongside = faster uptake":
    "Ditambah karbohidrat = penyerapan lebih cepat",
  "Becomes Serotonin":
    "Menjadi Serotonin",
  "Mood, calm, reduced anxiety":
    "Suasana hati, tenang, cemas berkurang",
  "Becomes Melatonin":
    "Menjadi Melatonin",
  "Regulates sleep onset and depth":
    "Mengatur mulai tidur dan kedalamannya",
  "Deep Sleep":
    "Tidur Nyenyak",
  "GH pulse releases — repair begins":
    "Lonjakan GH dilepas — perbaikan dimulai",
  "Pre-Sleep Options":
    "Pilihan Sebelum Tidur",
  "Warm Milk + Honey":
    "Susu Hangat + Madu",
  "Tryptophan + casein (slow overnight protein) + simple carbs to drive tryptophan into the brain. Best pre-sleep option on training nights.":
    "Triptofan + kasein (protein lambat semalaman) + karbohidrat sederhana untuk mendorong triptofan ke otak. Pilihan terbaik sebelum tidur di malam hari latihan.",
  "Banana":
    "Pisang",
  "Tryptophan + magnesium (muscle relaxation) + B6 (needed to convert tryptophan to serotonin). Cheap, portable, available everywhere.":
    "Triptofan + magnesium (relaksasi otot) + B6 (dibutuhkan untuk mengubah triptofan menjadi serotonin). Murah, mudah dibawa, ada di mana-mana.",
  "Oats + Milk":
    "Oat + Susu",
  "Melatonin precursors in oats + tryptophan in milk. If dinner was early, a small bowl 1 hour before bed provides overnight protein and sleep support.":
    "Prekursor melatonin dalam oat + triptofan dalam susu. Kalau makan malam lebih awal, semangkuk kecil 1 jam sebelum tidur memberi protein semalaman dan membantu tidur.",
  "Dehydration — What It Costs You":
    "Dehidrasi — Apa Akibatnya Bagimu",
  "Water makes up 73% of muscle tissue. Dehydration begins affecting performance before thirst is felt — by the time you're thirsty, you're already 1–2% dehydrated and speed has dropped.":
    "Air membentuk 73% jaringan otot. Dehidrasi mulai memengaruhi performa sebelum rasa haus muncul — saat kamu haus, kamu sudah dehidrasi 1–2% dan kecepatanmu sudah turun.",
  "body weight (0.6–0.7L lost) — impaired temperature regulation · harder to cool down":
    "berat badan (0,6–0,7 L hilang) — pengaturan suhu tubuh terganggu · lebih sulit mendingin",
  "body weight (~1.4L lost) — 10% drop in sprint speed · reduced passing accuracy":
    "berat badan (~1,4 L hilang) — kecepatan sprint turun 10% · akurasi umpan menurun",
  "body weight (~2.1L lost) — decision-making impaired · reaction time slows":
    "berat badan (~2,1 L hilang) — pengambilan keputusan terganggu · waktu reaksi melambat",
  "body weight (~2.8L lost) — cramps · heat exhaustion risk · forced withdrawal":
    "berat badan (~2,8 L hilang) — kram · risiko kelelahan panas · terpaksa berhenti",
  "The Urine Colour Check — Your Daily Data Point":
    "Cek Warna Urine — Data Harianmu",
  "No app needed. Check every morning — it tells you yesterday's hydration status and what to do today. 1–2: well hydrated. 3–4: drink more today. 5–6: dehydrated — act now. 7–8: flag this.\n\nJakarta at 30–34°C / 75–85% humidity: sweat rate is 1–2L/hour during intense sessions — 2–4× higher than temperate climate guidelines assume. The standard \"drink when thirsty\" rule does not apply here.":
    "Tidak perlu aplikasi. Cek setiap pagi — warnanya memberi tahu status hidrasimu kemarin dan apa yang harus dilakukan hari ini. 1–2: terhidrasi baik. 3–4: minum lebih banyak hari ini. 5–6: dehidrasi — segera bertindak. 7–8: laporkan ini.\n\nJakarta di suhu 30–34°C / kelembapan 75–85%: laju keringat 1–2 L/jam saat sesi intens — 2–4× lebih tinggi dari asumsi pedoman untuk iklim sedang. Aturan umum \"minum saat haus\" tidak berlaku di sini.",
  "Training Day Fluid Protocol":
    "Protokol Cairan Hari Latihan",
  "Sweat is not just water — it contains sodium (~900mg/L), potassium (~200mg/L) and magnesium (~36mg/L). Replacing fluid without electrolytes during long sessions causes hyponatraemia (sodium dilution) which impairs performance worse than dehydration alone. For sessions under 60 minutes: water is adequate. Over 60 minutes or any match play: electrolyte replacement is essential.":
    "Keringat bukan hanya air — isinya natrium (~900 mg/L), kalium (~200 mg/L) dan magnesium (~36 mg/L). Mengganti cairan tanpa elektrolit saat sesi panjang menyebabkan hiponatremia (natrium terlalu encer) yang menurunkan performa lebih parah daripada dehidrasi saja. Untuk sesi di bawah 60 menit: air sudah cukup. Lebih dari 60 menit atau saat bertanding: penggantian elektrolit wajib.",
  "WAKE UP":
    "BANGUN TIDUR",
  "mL water · first thing":
    "mL air · paling pertama",
  "PRE-TRAINING":
    "SEBELUM LATIHAN",
  "mL water · 1–2 hrs before":
    "mL air · 1–2 jam sebelumnya",
  "DURING TRAINING":
    "SAAT LATIHAN",
  "mL every 20 min · add electrolytes if >60 min":
    "mL setiap 20 menit · tambah elektrolit jika >60 menit",
  "mL + electrolytes · replace 1.5× lost":
    "mL + elektrolit · ganti 1,5× yang hilang",
  "Best Electrolyte Sources — Jakarta":
    "Sumber Elektrolit Terbaik — Jakarta",
  "Fresh Coconut Water":
    "Air Kelapa Muda Segar",
  "~600mg potassium · ~250mg sodium · ~60mg magnesium per 330mL. Better than sports drinks, cheaper, natural. Fresh only — avoid canned or sweetened variants.":
    "~600 mg kalium · ~250 mg natrium · ~60 mg magnesium per 330 mL. Lebih baik dari minuman olahraga, lebih murah, alami. Hanya yang segar — hindari yang kalengan atau diberi pemanis.",
  "Formulated electrolyte drink. Adequate sodium and potassium for sessions. Convenient during match play. Use during or immediately after sessions >60 min. Not necessary at rest.":
    "Minuman elektrolit racikan pabrik. Natrium dan kalium cukup untuk sesi latihan. Praktis saat bertanding. Minum saat atau segera setelah sesi >60 menit. Tidak perlu saat istirahat.",
  "DIY Electrolyte":
    "Elektrolit Buatan Sendiri",
  "500mL fresh coconut water + squeeze of lime + pinch of salt + 1 tsp honey. Covers sodium, potassium, fast carbs. Athletes can make this themselves — better than any bottled option.":
    "500 mL air kelapa muda segar + perasan jeruk nipis + sejumput garam + 1 sdt madu. Mengandung natrium, kalium, karbohidrat cepat. Atlet bisa membuatnya sendiri — lebih baik dari pilihan kemasan mana pun.",
  "Log Urine Colour Every Morning + Pre-Sleep Recovery":
    "Catat Warna Urine Setiap Pagi + Pemulihan Sebelum Tidur",
  "Two things this week. First: check your urine colour every morning and report it in Sunday's check-in — this becomes your hydration data for the research. If you're hitting 5+ regularly, drink more and check what you ate post-training.\n\nSecond: on training nights, have warm milk or a banana 30 minutes before sleep. That's your tryptophan window — it directly supports the GH pulse that repairs what training broke.\n\nSunday check-in adds one new question this week: average sleep hours on training nights. This is your recovery data. The more complete, the stronger the Week 4 before/after story.":
    "Dua hal minggu ini. Pertama: cek warna urinemu setiap pagi dan laporkan di check-in hari Minggu — ini menjadi data hidrasimu untuk riset. Kalau sering 5+, minum lebih banyak dan cek apa yang kamu makan setelah latihan.\n\nKedua: di malam hari latihan, minum susu hangat atau makan pisang 30 menit sebelum tidur. Itu waktu triptofanmu — langsung mendukung lonjakan GH yang memperbaiki apa yang dirusak latihan.\n\nCheck-in hari Minggu menambah satu pertanyaan baru minggu ini: rata-rata jam tidur di malam hari latihan. Ini data pemulihanmu. Makin lengkap, makin kuat cerita sebelum/sesudah di Minggu 4.",
  "Game Ready. The Final Chapter.":
    "Siap Bertanding. Bab Terakhir.",
  "Four weeks ago you came in with the numbers. Today you understand them. This is where everything — carbs, protein, hydration, sleep — comes together into one game plan.":
    "Empat minggu lalu kamu datang dengan angka-angka. Hari ini kamu memahaminya. Di sinilah semuanya — karbohidrat, protein, hidrasi, tidur — menyatu menjadi satu rencana pertandingan.",
  "Four Weeks. Four Building Blocks.":
    "Empat Minggu. Empat Fondasi.",
  "WEEK 1 · Carbs":
    "MINGGU 1 · Karbohidrat",
  "6–10g CHO/kg/day — build to 2–3 cups rice per meal.":
    "6–10 g KH/kg/hari — tingkatkan sampai 2–3 cangkir nasi per makan.",
  "Sprint fuel. Glycogen powers the first touch, the press, the final run — not willpower.":
    "Bahan bakar sprint. Glikogen yang menggerakkan sentuhan pertama, pressing, dan lari terakhir — bukan tekad.",
  "WEEK 2 · Protein":
    "MINGGU 2 · Protein",
  "1.4–1.7g/kg/day — 20–25g protein at each meal.":
    "1,4–1,7 g/kg/hari — 20–25 g protein di setiap makan.",
  "Not for size. For repair. Post-session muscle damage needs protein as the building material.":
    "Bukan untuk membesarkan badan. Untuk perbaikan. Kerusakan otot setelah sesi butuh protein sebagai bahan bangunannya.",
  "WEEK 3 · Hydration & Sleep":
    "MINGGU 3 · Hidrasi & Tidur",
  "Urine colour 1–3. 35–40mL fluid/kg/day. 8–9 hrs.":
    "Warna urine 1–3. 35–40 mL cairan/kg/hari. 8–9 jam.",
  "The two things that make everything else work. Under-slept or dehydrated, Weeks 1–2 mean very little.":
    "Dua hal yang membuat semua yang lain bekerja. Kurang tidur atau dehidrasi, Minggu 1–2 tidak banyak artinya.",
  "WEEK 4 · Integration":
    "MINGGU 4 · Integrasi",
  "Pre-load, sustain, and recover — every training and competition day.":
    "Isi sebelum, jaga selama, dan pulihkan setelah — setiap hari latihan dan pertandingan.",
  "Apply all three on the same day — game day, assessment day, any day your body is working hard.":
    "Terapkan ketiganya di hari yang sama — hari pertandingan, hari tes, hari apa pun tubuhmu bekerja keras.",
  "The Numbers Don't Lie":
    "Angka Tidak Bohong",
  "The standout gap: every athlete was eating 50–60% of daily needs while training. Carbohydrates were the biggest deficit across the board.":
    "Celah yang paling menonjol: setiap atlet hanya makan 50–60% kebutuhan hariannya saat berlatih. Karbohidrat adalah kekurangan terbesar di semua atlet.",
  "Group avg daily calories":
    "Rata-rata kalori harian kelompok",
  "~1,702 kcal":
    "~1.702 kkal",
  "Target on a training day":
    "Target di hari latihan",
  "~3,000 kcal":
    "~3.000 kkal",
  "Lowest carb intake in group":
    "Asupan karbohidrat terendah di kelompok",
  "87g/day":
    "87 g/hari",
  "Highest carb intake in group":
    "Asupan karbohidrat tertinggi di kelompok",
  "262g/day":
    "262 g/hari",
  "Carbohydrate target":
    "Target karbohidrat",
  "400–455g/day":
    "400–455 g/hari",
  "Best protein in group":
    "Protein tertinggi di kelompok",
  "134g/day":
    "134 g/hari",
  "Lowest protein in group":
    "Protein terendah di kelompok",
  "64g/day":
    "64 g/hari",
  "Urine colour avg (group) — dehydrated":
    "Rata-rata warna urine (kelompok) — dehidrasi",
  "You Started Moving the Numbers":
    "Kamu Mulai Menggerakkan Angkanya",
  "The pattern: imperfect, but real. Consistency over perfection is what moves scores.":
    "Polanya: belum sempurna, tapi nyata. Konsistensi, bukan kesempurnaan, yang menggerakkan skor.",
  "BREAKFAST — WHOLE GROUP, BOTH WEEKS":
    "SARAPAN — SELURUH KELOMPOK, KEDUA MINGGU",
  "Every day":
    "Setiap hari",
  "The simplest habit held consistently across all athletes. One meal. That's the foundation everything else builds on.":
    "Kebiasaan paling sederhana yang dijaga konsisten oleh semua atlet. Satu kali makan. Itulah fondasi tempat semua yang lain dibangun.",
  "AVERAGE FLUID INTAKE, WEEK 1→2":
    "RATA-RATA ASUPAN CAIRAN, MINGGU 1→2",
  "Daily fluid intake roughly doubled from baseline. One athlete hit urine colour 2 — the clearest single turnaround in the group.":
    "Asupan cairan harian kira-kira dua kali lipat dari awal. Satu atlet mencapai warna urine 2 — perubahan paling jelas di kelompok.",
  "SELF-RATED ENERGY, GROUP TREND":
    "ENERGI MENURUT PENILAIAN SENDIRI, TREN KELOMPOK",
  "Athletes with the lowest baseline carb intakes showed the sharpest energy improvements once fuelling consistently.":
    "Atlet dengan asupan karbohidrat awal paling rendah menunjukkan peningkatan energi paling tajam begitu makan cukup secara konsisten.",
  "Your Brain Runs on Glucose Too":
    "Otakmu Juga Butuh Glukosa",
  "The wrong pass in the 75th minute. The missed read. The slow first touch. These aren't always fitness problems — they're often fuel problems.\n\nFor a sharper second half: low-GI carbs 2–3 hrs before (nasi merah [brown rice], oat, noodles) + protein. Avoid high-sugar drinks 1 hr before — the insulin spike causes a glucose crash at kickoff.":
    "Umpan salah di menit ke-75. Salah membaca permainan. Sentuhan pertama yang lambat. Ini tidak selalu masalah kebugaran — sering kali masalah bahan bakar.\n\nUntuk babak kedua yang lebih tajam: karbohidrat IG rendah 2–3 jam sebelumnya (nasi merah, oat, mi) + protein. Hindari minuman tinggi gula 1 jam sebelumnya — lonjakan insulin menyebabkan gula darah anjlok saat kick-off.",
  "BRAIN'S DAILY GLUCOSE SHARE":
    "BAGIAN GLUKOSA HARIAN UNTUK OTAK",
  "The brain is 2% of body weight but consumes 20% of daily glucose. During high-pressure sport that demand increases. Blood glucose dips = slower thinking, worse decisions.":
    "Otak hanya 2% berat badan tapi memakai 20% glukosa harian. Saat olahraga bertekanan tinggi kebutuhan itu naik. Gula darah turun = berpikir lebih lambat, keputusan lebih buruk.",
  "REACTION TIME DROP":
    "WAKTU REAKSI MENURUN",
  "At just 2% dehydration — before you feel thirsty — reaction time measurably drops.":
    "Dengan dehidrasi baru 2% — sebelum kamu merasa haus — waktu reaksi sudah terukur menurun.",
  "THE BRAIN-BUILDING FAT":
    "LEMAK PEMBANGUN OTAK",
  "Omega-3 DHA is a structural part of brain cell membranes. It affects how fast neural signals travel.":
    "DHA omega-3 adalah bagian struktur membran sel otak. DHA memengaruhi seberapa cepat sinyal saraf bergerak.",
  "Know What You're Actually Taking":
    "Ketahui Apa yang Sebenarnya Kamu Konsumsi",
  "Only supplement what food cannot fix. For this group, that's Vitamin D. Everything else has a food solution.":
    "Hanya pakai suplemen untuk yang tidak bisa dipenuhi makanan. Untuk kelompok ini, itu Vitamin D. Semua yang lain ada solusinya dari makanan.",
  "Creatine Monohydrate":
    "Kreatin Monohidrat",
  "Mixed for youth":
    "Bukti beragam untuk usia muda",
  "ACSM advises caution under 18. Adult evidence is strong for power sport; benefit for intermittent sport is modest. If using: 3–5g/day, not loading doses.":
    "ACSM menyarankan kehati-hatian di bawah 18 tahun. Bukti pada orang dewasa kuat untuk olahraga power; manfaat untuk olahraga intermiten kecil. Jika memakai: 3–5 g/hari, bukan dosis loading.",
  "Good evidence":
    "Bukti baik",
  "Athletes lose magnesium through sweat. Supports sleep quality, reduces cramping. 300–400mg magnesium glycinate is the best-absorbed form.":
    "Atlet kehilangan magnesium lewat keringat. Membantu kualitas tidur, mengurangi kram. 300–400 mg magnesium glisinat adalah bentuk yang paling mudah diserap.",
  "Strong evidence":
    "Bukti kuat",
  "Indoor training in Jakarta means limited UV synthesis. All athletes should consider 1,000–2,000IU D3 — not just those already supplementing.":
    "Latihan di dalam ruangan di Jakarta berarti pembentukan vitamin D dari sinar UV terbatas. Semua atlet sebaiknya mempertimbangkan 1.000–2.000 IU D3 — bukan hanya yang sudah memakai suplemen.",
  "Pre-workouts & Protein Powders":
    "Pre-workout & Protein Bubuk",
  "Not needed":
    "Tidak perlu",
  "Food-first targets haven't been hit yet — fix that first. Pre-workouts marketed to teens often contain stimulants not appropriate under 18.":
    "Target dari makanan saja belum tercapai — perbaiki itu dulu. Pre-workout yang dipasarkan untuk remaja sering mengandung stimulan yang tidak cocok untuk usia di bawah 18 tahun.",
  "What Chronic Under-Fuelling Does":
    "Akibat Kurang Makan Jangka Panjang",
  "This group entered the programme eating 50–60% of daily energy needs while active. This is called RED-S — Relative Energy Deficiency in Sport — a clinical condition recognised by the IOC that affects lean, athletic-looking athletes at any age.":
    "Kelompok ini masuk program dengan hanya makan 50–60% kebutuhan energi harian saat aktif. Ini disebut RED-S — Relative Energy Deficiency in Sport (Defisiensi Energi Relatif dalam Olahraga) — kondisi klinis yang diakui IOC dan bisa dialami atlet yang tampak ramping dan atletis di usia berapa pun.",
  "BONE DENSITY":
    "KEPADATAN TULANG",
  "Peak bone mass is built right now. Under-fuelling during this window cannot be recovered later.":
    "Puncak massa tulang dibangun sekarang. Kurang makan di masa ini tidak bisa dikejar nanti.",
  "HORMONES":
    "HORMON",
  "Low energy availability suppresses testosterone — the main driver of muscle development at 14–16.":
    "Ketersediaan energi yang rendah menekan testosteron — pendorong utama perkembangan otot di usia 14–16.",
  "IMMUNITY":
    "KEKEBALAN TUBUH",
  "More frequent illness, slower healing, longer recovery between sessions.":
    "Lebih sering sakit, penyembuhan lebih lambat, pemulihan antarsesi lebih lama.",
  "MOOD & FOCUS":
    "SUASANA HATI & FOKUS",
  "Irritability and poor concentration — especially in afternoons after activity.":
    "Mudah marah dan sulit berkonsentrasi — terutama sore hari setelah beraktivitas.",
  "PERFORMANCE DECLINES":
    "PERFORMA MENURUN",
  "Strength and endurance drop — not because fitness fell, but because the body is protecting vital organs.":
    "Kekuatan dan daya tahan turun — bukan karena kebugaran turun, tapi karena tubuh sedang melindungi organ vital.",
  "Execute This When It Counts":
    "Jalankan Ini Saat Paling Penting",
  "Your post-assessment is coming. What you eat the night before and morning of will show up in your numbers.":
    "Tes akhirmu sudah dekat. Apa yang kamu makan malam sebelumnya dan pagi harinya akan terlihat di angkamu.",
  "NIGHT BEFORE":
    "MALAM SEBELUMNYA",
  "Carb-load dinner + 8–9 hrs sleep":
    "Makan malam tinggi karbohidrat + tidur 8–9 jam",
  "Bigger rice portion. Nasi (rice) + ayam (chicken) + sayur (veg). No new foods.":
    "Porsi nasi lebih besar. Nasi + ayam + sayur. Jangan coba makanan baru.",
  "MORNING":
    "PAGI HARI",
  "Breakfast + 500mL water on waking":
    "Sarapan + 500 mL air saat bangun",
  "Nasi (rice) or noodles + telur (eggs). Familiar food. No heavy fat.":
    "Nasi atau mi + telur. Makanan yang biasa. Hindari yang berat dan berlemak.",
  "1 HR BEFORE":
    "1 JAM SEBELUMNYA",
  "Top-up snack + 500mL fluid":
    "Camilan tambahan + 500 mL cairan",
  "Pisang (banana) or roti + selai kacang (bread + peanut butter). Pocari or kelapa muda (coconut water).":
    "Pisang atau roti + selai kacang. Pocari atau kelapa muda.",
  "DURING":
    "SELAMA BERTANDING",
  "Sip every 15–20 min":
    "Minum sedikit setiap 15–20 menit",
  "Don't wait for thirst. Small consistent sips beats big gulps at the end.":
    "Jangan tunggu haus. Teguk kecil yang rutin lebih baik dari tegukan besar di akhir.",
  "WITHIN 30 MIN":
    "DALAM 30 MENIT",
  "Recovery — carbs + protein":
    "Pemulihan — karbohidrat + protein",
  "Jus semangka (watermelon juice) + telur rebus (boiled egg). Full meal within 2 hours.":
    "Jus semangka + telur rebus. Makan lengkap dalam 2 jam.",
  "Everything You Need Already Exists Here":
    "Semua yang Kamu Butuhkan Sudah Ada di Sini",
  "Pisang (Banana)":
    "Pisang",
  "Fast carbs + potassium":
    "Karbohidrat cepat + kalium",
  "Pre-session or half-time. Cheap, available everywhere, no prep.":
    "Sebelum sesi atau saat jeda. Murah, ada di mana-mana, tanpa persiapan.",
  "Susu + Madu (Milk + Honey)":
    "Susu + Madu",
  "Casein protein before sleep":
    "Protein kasein sebelum tidur",
  "30 min before bed. Slow-release protein overnight while growth hormone peaks.":
    "30 menit sebelum tidur. Protein yang dilepas perlahan semalaman saat hormon pertumbuhan memuncak.",
  "Kelapa Muda (Coconut Water)":
    "Kelapa Muda",
  "Natural electrolytes":
    "Elektrolit alami",
  "Na, K, Mg. Better profile than most sports drinks. Cold. Every warung.":
    "Na, K, Mg. Kandungannya lebih baik dari kebanyakan minuman olahraga. Dingin. Ada di setiap warung.",
  "Telur (Eggs)":
    "Telur",
  "Complete protein — all 9 EAAs":
    "Protein lengkap — kesembilan asam amino esensial",
  "Breakfast daily. Post-session. 2–3 eggs = 12–18g protein.":
    "Sarapan setiap hari. Setelah sesi. 2–3 telur = 12–18 g protein.",
  "Tempe (Fermented Soybean)":
    "Tempe",
  "Protein + iron + calcium + probiotics":
    "Protein + zat besi + kalsium + probiotik",
  "Fermented = better gut absorption. The most underrated food on this list.":
    "Difermentasi = lebih mudah diserap usus. Makanan paling diremehkan di daftar ini.",
  "Ikan Kembung (Mackerel)":
    "Ikan Kembung",
  "Omega-3 DHA — brain + reaction speed":
    "Omega-3 DHA — otak + kecepatan reaksi",
  "Biggest dietary gap in this group. 2–3×/week. Sarden kaleng (sardines) works too.":
    "Kekurangan makanan terbesar di kelompok ini. 2–3×/minggu. Sarden kaleng juga bisa.",
  "Run the Full Morning Protocol":
    "Jalankan Protokol Pagi Lengkap",
  "Three things this week. Run the game day protocol at least once — bigger carb dinner the night before, 500mL water on waking, breakfast before training, top-up snack 1hr before. Even if it's just a training session, treat it like a game.\n\nPost-session recovery within 30 minutes every time — something with carbs + protein. This is the habit that separates being sore tomorrow from being ready tomorrow.\n\nPost-assessment is coming — do NOT arrive to it fasted. Everything we've built shows up in those numbers or it doesn't.\n\nThis week's challenge: run the full morning protocol one day — 500mL water on waking, breakfast before training, check your urine colour.":
    "Tiga hal minggu ini. Jalankan protokol hari pertandingan setidaknya sekali — makan malam tinggi karbohidrat di malam sebelumnya, 500 mL air saat bangun, sarapan sebelum latihan, camilan tambahan 1 jam sebelumnya. Walau hanya sesi latihan, perlakukan seperti pertandingan.\n\nPemulihan setelah sesi dalam 30 menit setiap kali — sesuatu dengan karbohidrat + protein. Kebiasaan inilah yang membedakan pegal besok dengan siap besok.\n\nTes akhir sudah dekat — JANGAN datang dalam keadaan perut kosong. Semua yang sudah kita bangun akan terlihat di angka itu, atau tidak sama sekali.\n\nTantangan minggu ini: jalankan protokol pagi lengkap selama satu hari — 500 mL air saat bangun, sarapan sebelum latihan, cek warna urinemu.",
  "You Already Knew How to Eat. Now You Know Why.":
    "Kamu Sudah Tahu Cara Makan. Sekarang Kamu Tahu Alasannya.",
  "Nasi (rice) is not the enemy. Pisang (banana) before training is not baby food. Susu (milk) at night is not random. The food at every warung (food stall) in Jakarta is genuinely good athlete fuel — you just needed to know when, how much, and what to add.\n\nThe habits that moved your scores in four weeks are the same ones that will keep moving them.":
    "Nasi bukan musuh. Pisang sebelum latihan bukan makanan bayi. Susu di malam hari bukan sembarangan. Makanan di setiap warung di Jakarta sebenarnya bahan bakar atlet yang bagus — kamu hanya perlu tahu kapan, berapa banyak, dan apa yang perlu ditambahkan.\n\nKebiasaan yang menggerakkan skormu dalam empat minggu adalah kebiasaan yang sama yang akan terus menggerakkannya.",
};
