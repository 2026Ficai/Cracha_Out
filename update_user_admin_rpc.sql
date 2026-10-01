-- ==========================================
-- SCRIPT DE ATUALIZAÇÃO DE USUÁRIOS E SENHAS (SUPABASE)
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ==========================================

-- Habilitar extensão pgcrypto para criptografia de senhas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Função RPC para Administrador Atualizar Dados/Senha de um Usuário
CREATE OR REPLACE FUNCTION public.admin_update_user_credentials(
    target_user_id UUID,
    new_name TEXT DEFAULT NULL,
    new_email TEXT DEFAULT NULL,
    new_password TEXT DEFAULT NULL,
    new_role TEXT DEFAULT NULL,
    new_status TEXT DEFAULT NULL,
    new_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_email TEXT;
BEGIN
    v_clean_email := lower(trim(new_email));

    -- 1. Atualizar a senha no Supabase Auth caso informada
    IF new_password IS NOT NULL AND trim(new_password) <> '' THEN
        UPDATE auth.users 
        SET encrypted_password = crypt(trim(new_password), gen_salt('bf')),
            updated_at = now()
        WHERE id = target_user_id;
    END IF;

    -- 2. Atualizar o e-mail no Supabase Auth caso informado
    IF v_clean_email IS NOT NULL AND v_clean_email <> '' THEN
        UPDATE auth.users 
        SET email = v_clean_email,
            email_change = '',
            updated_at = now()
        WHERE id = target_user_id;
    END IF;

    -- 3. Atualizar a tabela pública app_users
    UPDATE public.app_users
    SET name = COALESCE(NULLIF(trim(new_name), ''), name),
        email = COALESCE(v_clean_email, email),
        role = COALESCE(new_role, role),
        status = COALESCE(new_status, status),
        school_id = new_school_id
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Usuário e credenciais atualizados com sucesso!');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Função RPC para Administrador Criar Novo Usuário com Senha no Supabase
CREATE OR REPLACE FUNCTION public.admin_create_user(
    new_name TEXT,
    new_email TEXT,
    new_password TEXT,
    new_role TEXT DEFAULT 'usuario',
    new_status TEXT DEFAULT 'active',
    new_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_id UUID;
    v_clean_email TEXT;
BEGIN
    v_clean_email := lower(trim(new_email));
    v_new_id := gen_random_uuid();

    -- Inserir na auth.users
    INSERT INTO auth.users (
        id, instance_id, aud, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        role, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
        v_new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', v_clean_email,
        crypt(trim(new_password), gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', jsonb_build_object('name', new_name, 'full_name', new_name), now(), now(),
        'authenticated', '', '', '', ''
    );

    -- Inserir na public.app_users
    INSERT INTO public.app_users (id, name, email, role, status, school_id)
    VALUES (v_new_id, new_name, v_clean_email, new_role, new_status, new_school_id)
    ON CONFLICT (email) DO UPDATE 
    SET name = EXCLUDED.name, school_id = EXCLUDED.school_id, role = EXCLUDED.role, status = EXCLUDED.status;

    RETURN jsonb_build_object('success', true, 'user_id', v_new_id, 'message', 'Novo usuário criado com sucesso!');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Conceder permissões para invocação das funções
GRANT EXECUTE ON FUNCTION public.admin_update_user_credentials TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_user TO anon, authenticated, service_role;
