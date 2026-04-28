-- =====================================================================
-- PPP tiers + subscription plans + disposable email blocklist seed
-- =====================================================================

INSERT INTO ppp_tiers (tier_name, countries, multiplier, price_usd, price_inr, price_eur) VALUES
('Tier1',
 '["US","GB","CA","AU","NZ","SG","JP","CH","NO","SE","DK","IS"]'::jsonb,
 1.000, 9.00, 749.00, 8.30),
('Tier2',
 '["DE","FR","IT","ES","NL","BE","AT","FI","IE","PT","PL","CZ","HU","RO","SK","GR","CY","LU","EE","LV","LT","MT","SI","BG","HR","RS","UA","TR"]'::jsonb,
 0.800, 7.20, 599.00, 6.60),
('Tier3',
 '["IN","PK","BD","LK","NP","MM","ID","TH","VN","PH","MY","KH","LA","TL","BT"]'::jsonb,
 0.500, 4.50, 379.00, 4.10),
('Tier4',
 '["XX"]'::jsonb,
 0.300, 2.70, 229.00, 2.50);

INSERT INTO subscription_plans (name, monthly_credits, feature_limits, price_tiers, active) VALUES
('Starter', 500,
 '{"image_gen_per_day": 50, "team_seats": 1}'::jsonb,
 '{"USD": 9, "INR": 749, "EUR": 8.30}'::jsonb, true),
('Pro', 2000,
 '{"image_gen_per_day": 200, "team_seats": 1}'::jsonb,
 '{"USD": 29, "INR": 2399, "EUR": 26.50}'::jsonb, true),
('Team', 5000,
 '{"image_gen_per_day": 500, "team_seats": 5}'::jsonb,
 '{"USD": 79, "INR": 6499, "EUR": 72.30}'::jsonb, true);

INSERT INTO email_domain_blocklist (domain, reason) VALUES
('mailinator.com','disposable'), ('guerrillamail.com','disposable'),
('tempmail.com','disposable'), ('throwaway.email','disposable'),
('yopmail.com','disposable'), ('fakeinbox.com','disposable'),
('trashmail.com','disposable'), ('sharklasers.com','disposable'),
('guerrillamailblock.com','disposable'), ('grr.la','disposable'),
('guerrillamail.info','disposable'), ('spam4.me','disposable'),
('maildrop.cc','disposable'), ('dispostable.com','disposable'),
('10minutemail.com','disposable'), ('10minutemail.net','disposable'),
('mohmal.com','disposable'), ('mailnesia.com','disposable'),
('mailnull.com','disposable'), ('spamgourmet.com','disposable'),
('trashmail.me','disposable'), ('discard.email','disposable'),
('mailexpire.com','disposable'), ('incognitomail.com','disposable'),
('filzmail.com','disposable'), ('throwam.com','disposable'),
('owlpic.com','disposable'), ('sogetthis.com','disposable'),
('mt2015.com','disposable'), ('mt2014.com','disposable'),
('spamfree24.org','disposable'), ('spamfree.eu','disposable'),
('nada.email','disposable'), ('spamgob.com','disposable'),
('spamhereplease.com','disposable'), ('mailsac.com','disposable'),
('throwem.com','disposable'), ('tempinbox.com','disposable'),
('0-mail.com','disposable'), ('0815.ru','disposable'),
('jetable.fr.nf','disposable'), ('noref.in','disposable'),
('zzz.com','disposable'), ('discardmail.com','disposable'),
('spamgold.com','disposable'), ('spam.la','disposable'),
('mailzilla.com','disposable'), ('spaml.de','disposable'),
('trashmailer.com','disposable')
ON CONFLICT (domain) DO NOTHING;
