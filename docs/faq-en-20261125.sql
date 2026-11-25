-- D-175: FAQ 영문 칸 추가와 영문 8문항 (대표 승인 후 적용)
alter table public.faq
  add column if not exists question_en text,
  add column if not exists answer_html_en text;

update public.faq set question_en = 'Do you grind the beans before shipping?',
  answer_html_en = '<p>We ship whole beans by default. Grind options (espresso, filter and more) will be added over time.</p>'
  where id = '57fba47b-3457-4725-9c93-cde8f8c05438';
update public.faq set question_en = 'What is your exchange and refund policy?',
  answer_html_en = '<p>Exchanges and refunds are available within 7 days of delivery only when the bag is unopened and the beans are undamaged. Because coffee is a fresh food product, change-of-mind refunds are not available once a bag has been opened.</p>'
  where id = '64ca0dde-a24f-4a28-a376-4cfbda0de6d6';
update public.faq set question_en = 'When do you roast and ship my coffee?',
  answer_html_en = '<p>MTSPACE COFFEE does not roast ahead and stockpile beans. We roast at our own roastery on a set cycle to match orders and ship in sequence, sending the freshest batch available (within 7 days at most).</p>'
  where id = 'cc49b9d6-7d55-4309-8a7a-12e72f3bc7ad';
update public.faq set question_en = 'How long does delivery take?',
  answer_html_en = '<p>Within Korea, delivery takes 1 to 2 days after dispatch (Lotte Global Logistics). Remote and island areas may take an extra 1 to 2 days. International orders ship by EMS Premium, and customs and local delivery can add time.</p>'
  where id = '689aa153-a41d-41ce-b3da-7f0462f110e5';
update public.faq set question_en = 'How much is domestic shipping?',
  answer_html_en = '<p>A standard shipping fee applies to orders under 10 kg, and a separate policy applies to bulk orders of 10 kg or more. You can see the exact amount at checkout.</p>'
  where id = '5d34550e-fe52-42e8-8099-288ce64b7843';
update public.faq set question_en = 'Do you ship internationally?',
  answer_html_en = '<p>Yes, coffee beans can be shipped worldwide by EMS Premium (paid via PayPal in USD). Rates by country and weight are calculated automatically at checkout.</p>'
  where id = '85c8de1c-ce2e-437a-8758-b6e97fc43cea';
update public.faq set question_en = 'How do businesses get wholesale pricing?',
  answer_html_en = '<p>Register as a business member. Once your business registration is verified, the wholesale catalogue and your member pricing apply to your account straight away. See <a href="/wholesale">cafe coffee supply</a> for supply terms and how it works.</p>'
  where id = 'dfb9d5a2-0a81-4766-9309-b1290e12e30b';
update public.faq set question_en = 'Can you issue a tax invoice?',
  answer_html_en = '<p>We issue Korean tax invoices (세금계산서) to approved business members, based on the business details registered in My Account.</p>'
  where id = 'e7e0134a-1dce-4a92-a691-a45876bbe667';
