INSERT INTO roles (id, name)
VALUES (gen_random_uuid(), 'ROLE_ADMIN'),
       (gen_random_uuid(), 'ROLE_COORDINATOR'),
       (gen_random_uuid(), 'ROLE_CAREGIVER')
ON CONFLICT (name) DO NOTHING;
