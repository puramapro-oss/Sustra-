# Guide d'installation SUTRA by Purama

## Etape 1 : Créer un projet Supabase (5 min)

1. Va sur **https://supabase.com** → Créer un compte gratuit
2. Clique **"New Project"**
3. Donne un nom (ex: `sutra-app`), choisis un mot de passe DB, région `eu-west`
4. Attends que le projet se crée (~2 min)
5. Va dans **Settings → API** et copie :
   - `Project URL` → colle dans `.env.local` à `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → colle dans `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → colle dans `SUPABASE_SERVICE_ROLE_KEY`

## Etape 2 : Créer la base de données (2 min)

1. Dans Supabase, va dans **SQL Editor** (menu gauche)
2. Clique **"New Query"**
3. Ouvre le fichier `scripts/setup-supabase.sql` de ce projet
4. **Copie-colle TOUT le contenu** dans l'éditeur SQL
5. Clique **"Run"** (bouton vert)
6. Tu devrais voir "Success" → Ta base est prête !

## Etape 3 : Activer Google Auth (3 min)

1. Dans Supabase → **Authentication → Providers**
2. Active **Google**
3. Va sur **https://console.cloud.google.com**
   - Crée un projet (ou utilise un existant)
   - Va dans **APIs & Services → Credentials**
   - Crée un **OAuth 2.0 Client ID** (type: Web application)
   - Ajoute en "Authorized redirect URIs" :
     ```
     https://TON-PROJET.supabase.co/auth/v1/callback
     ```
   - Copie le **Client ID** et **Client Secret**
4. Retourne dans Supabase → colle le Client ID et Secret dans les champs Google
5. Sauvegarde

## Etape 4 : Créer un compte Stripe (5 min)

1. Va sur **https://stripe.com** → Créer un compte
2. Va dans **Developers → API Keys** :
   - `Secret key` (sk_test_...) → colle dans `STRIPE_SECRET_KEY`
   - `Publishable key` (pk_test_...) → colle dans `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Crée les 3 produits :
   - Va dans **Products → Add Product**
   - **Produit 1** : Nom = "Starter", Prix = 9€/mois récurrent → copie le `price_id` dans `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`
   - **Produit 2** : Nom = "Créateur", Prix = 29€/mois récurrent → copie le `price_id` dans `NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID`
   - **Produit 3** : Nom = "Empire", Prix = 99€/mois récurrent → copie le `price_id` dans `NEXT_PUBLIC_STRIPE_EMPIRE_PRICE_ID`
4. Configure le webhook :
   - Va dans **Developers → Webhooks → Add endpoint**
   - URL : `https://ton-domaine.com/api/webhooks/stripe` (en dev, utilise ngrok)
   - Events à écouter : `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copie le **Signing secret** (whsec_...) → colle dans `STRIPE_WEBHOOK_SECRET`

## Etape 5 : Clés API (5 min)

| Service | URL | Variable .env |
|---------|-----|---------------|
| **Anthropic (Claude)** | https://console.anthropic.com/settings/keys | `ANTHROPIC_API_KEY` |
| **ElevenLabs** | https://elevenlabs.io → Profile → API Key | `ELEVENLABS_API_KEY` |
| **fal.ai** | https://fal.ai/dashboard/keys | `FAL_KEY` |
| **Shotstack** | https://dashboard.shotstack.io → API Key | `SHOTSTACK_API_KEY` |
| **Pexels** (gratuit) | https://www.pexels.com/api/new/ | `PEXELS_API_KEY` |

## Etape 6 : Lancer le projet

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev
```

Ouvre **http://localhost:3000** dans ton navigateur.

## Etape 7 : Se connecter comme Admin

1. Connecte-toi avec le compte **matiss.frasne@gmail.com**
2. Dans Supabase SQL Editor, exécute :
```sql
UPDATE profiles SET role = 'super_admin' WHERE email = 'matiss.frasne@gmail.com';
```
3. Tu auras accès au panel Admin dans le menu

## Résumé des coûts

| Service | Plan gratuit | Suffisant pour démarrer ? |
|---------|-------------|--------------------------|
| Supabase | 500 MB DB, 1 GB storage | Oui |
| Stripe | 0€ (commission par transaction) | Oui |
| Anthropic | ~5$ de crédits offerts | Oui pour tester |
| ElevenLabs | 10 000 caractères/mois | Oui pour tester |
| fal.ai | Crédits gratuits au début | Oui pour tester |
| Shotstack | Sandbox gratuit (watermark) | Oui pour tester |
| Pexels | 100% gratuit | Oui |
