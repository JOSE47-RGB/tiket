-- Ejecutar una sola vez con root u otro administrador que tenga GRANT OPTION.
-- La cuenta transmetro_app ya fue creada. No se cambia ninguna contraseña.
GRANT SELECT, INSERT, UPDATE ON transmetro_db.* TO 'transmetro_app'@'localhost';
