-- Fix sticker numbering gap - update sticker #10 to #9 and #11 to #10
UPDATE stickers 
SET sticker_number = 9 
WHERE id = 'b1688798-8cb9-477f-abd8-cc8ef6782095' 
  AND collection_id = '2522841e-aad5-4c36-874c-8e61c74f2de5';

UPDATE stickers 
SET sticker_number = 10 
WHERE id = '16b4a0b8-c30b-4f84-bc21-4473e12af0b5' 
  AND collection_id = '2522841e-aad5-4c36-874c-8e61c74f2de5';