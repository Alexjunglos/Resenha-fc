# Resenha FC

Aplicativo web responsivo para o futebol semanal. Pode ser publicado gratuitamente na Vercel e aberto no Android ou iPhone.

## 1. Configurar o Supabase
1. No Supabase, copie o **Project URL** e a **Publishable key**.
2. Abra `public/config.js`.
3. Substitua `COLE_AQUI_O_PROJECT_URL` e `COLE_AQUI_A_PUBLISHABLE_KEY`.
4. Nunca use `secret` ou `service_role` no navegador.

## 2. Publicar na Vercel
1. Envie esta pasta para um repositório GitHub.
2. Na Vercel, escolha **Add New > Project** e importe o repositório.
3. A Vercel detecta Vite automaticamente. Build command: `npm run build`; Output directory: `dist`.
4. Publique. A Vercel fornecerá um endereço `.vercel.app`.

## 3. Configurar autenticação
No Supabase, em Authentication > URL Configuration, defina o endereço `.vercel.app` como Site URL e adicione-o às Redirect URLs.

Para testes, em Authentication > Providers > Email, confira a configuração de confirmação de e-mail.

## 4. Administradores
Depois que os dois administradores criarem suas contas pelo aplicativo, execute no SQL Editor (substituindo os e-mails):
```sql
update public.profiles
set role = 'admin'
where email in ('admin1@email.com', 'admin2@email.com');
```
Saia e entre novamente para atualizar a sessão.

## Observações importantes
- A chave `Publishable` é apropriada para o navegador quando as políticas RLS estão corretamente configuradas.
- O rateio registrado guarda o total, a quantidade de presentes e o valor por pessoa; ainda não cria cobranças individuais.
- O módulo de estatísticas usa `player_name` em `player_stats`. Se o esquema SQL já criado não tiver essa coluna, será necessário ajustar a tabela ou o formulário.
- Este pacote é uma primeira versão funcional e precisa ser testado com as tabelas e políticas já criadas no seu projeto Supabase.
