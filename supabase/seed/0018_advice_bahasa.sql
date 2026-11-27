-- Seed: Bahasa Indonesia for the twelve advice cards.
--
-- `advice_rules.message_id` has been empty since the table was made, so an
-- athlete who switched the app to Bahasa still read every card in English.
-- These are the app's translations of `message_en`, card for card. Food names
-- stay as the decks write them (nasi, ubi jalar, tempe, pisang, telur). They
-- have not been read by the dietitian or a native speaker: `reviewed_by` is
-- left as it is, and a corrected wording is one UPDATE.
--
-- Safe to run twice.

update public.advice_rules set message_id = v.message_id
from (values
  ('no_carbs_in_slot',
   'Nasi, ubi jalar, atau roti semuanya termasuk.'),
  ('no_breakfast_training_day',
   'Sarapan setiap hari latihan, walau hanya pisang atau roti dengan telur. Jangan latihan dengan perut kosong.'),
  ('refuel_window_open',
   'Isi ulang energi dalam 30 menit. Usahakan sekitar 3 bagian karbohidrat untuk 1 bagian protein.'),
  ('urine_five_or_worse',
   'Kehilangan 2% berat badan karena dehidrasi menurunkan kecepatan sprint sekitar 10%.'),
  ('pre_training_meal',
   'Makan besar 2 sampai 3 jam sebelum latihan. Nasi, pasta, nasi campur, apa saja yang tinggi karbohidrat.'),
  ('no_protein_breakfast',
   'Memulai hari dengan 0 g protein berarti satu waktu pemulihan otot terlewat bahkan sebelum latihan dimulai.'),
  ('no_protein_in_meal',
   'Tidak perlu mengubah apa yang sudah kamu makan, cukup tambahkan. Makan siang ada nasi dan sayur? Tambahkan tempe atau telur rebus.'),
  ('protein_piled_at_dinner',
   'Tubuh hanya bisa memakai 25–35 g per makan untuk sintesis protein otot. Tujuannya protein yang tersebar lebih baik sepanjang hari, bukan makan malam yang lebih besar.'),
  ('post_training_no_protein',
   'Buru-buru setelah latihan? 2 telur rebus + 1 pisang. Cuma 30 detik. Waktu pemulihanmu sudah terpenuhi.'),
  ('no_presleep_snack_training_night',
   'Pada malam hari latihan, minum susu hangat atau makan pisang 30 menit sebelum tidur.'),
  ('urine_three_or_four',
   '3–4: minum lebih banyak hari ini.'),
  ('top_up_snack_hour_before',
   'Camilan tambahan + 500 mL cairan. Pisang atau roti + selai kacang.')
) as v(code, message_id)
where public.advice_rules.code = v.code;
