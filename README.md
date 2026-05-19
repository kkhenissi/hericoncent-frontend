# HériConsent — Frontend Angular 17

Interface utilisateur complète de la plateforme de consentement des héritiers.

---

## Stack

| Composant     | Technologie            |
|---------------|------------------------|
| Framework     | Angular 17 (Standalone)|
| Auth          | JWT interceptor         |
| State         | Signals Angular 17      |
| Routing       | Lazy loading           |
| HTTP          | HttpClient + Interceptors|
| Styles        | CSS natif (aucun framework UI) |
| Fonts         | Playfair Display + DM Sans |
| Serveur prod  | Nginx (Docker)         |

---

## Lancer en développement

### Prérequis
- Node.js 20+
- Backend Spring Boot lancé sur `localhost:8080`

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de dev (avec proxy vers le backend)
npm start

# 3. Ouvrir dans le navigateur
# http://localhost:4200
```

Le `proxy.conf.json` redirige automatiquement `/api/*` vers `http://localhost:8080`.

---

## Lancer en production (Docker full-stack)

Depuis le dossier racine du projet :

```bash
# Lance tout : DB + MinIO + Backend + Frontend
docker-compose -f hericonsent-frontend/docker-compose.fullstack.yml up --build

# Accès :
# Application    → http://localhost
# MailHog        → http://localhost:8025
# MinIO Console  → http://localhost:9001
# Swagger API    → http://localhost:8080/api/swagger-ui.html
```

---

## Structure du projet

```
src/app/
├── app.component.ts          # Shell avec sidebar navigation
├── app.config.ts             # Config Angular (providers, interceptors)
├── app.routes.ts             # Routing principal (lazy loading)
│
├── core/
│   ├── services/
│   │   ├── api.service.ts    # Client HTTP centralisé
│   │   └── auth.service.ts   # Gestion JWT + état utilisateur (Signals)
│   └── interceptors/
│       └── auth.interceptor.ts  # JWT interceptor + Auth guard
│
├── features/
│   ├── auth/
│   │   ├── login.component.ts    # Page connexion
│   │   ├── register.component.ts # Page inscription
│   │   └── auth.routes.ts
│   │
│   ├── dashboard/
│   │   └── dashboard.component.ts  # Tableau de bord avec stats
│   │
│   ├── dossiers/
│   │   ├── dossiers-list.component.ts   # Liste avec filtres et recherche
│   │   ├── dossier-detail.component.ts  # Détail avec onglets
│   │   ├── dossier-form.component.ts    # Formulaire création
│   │   └── dossiers.routes.ts
│   │
│   └── consentements/
│       └── repondre-token.component.ts  # Page publique (lien email)
│
└── shared/
    └── models/
        └── models.ts    # Toutes les interfaces TypeScript
```

---

## Pages et fonctionnalités

### 🔐 Authentification
- **Login** (`/auth/login`) : connexion JWT avec boutons de test (Admin / Notaire)
- **Register** (`/auth/register`) : création de compte héritier

### 📊 Dashboard (`/dashboard`)
- Statistiques : total dossiers, ouverts, en vente, héritiers gérés
- Liste des 5 derniers dossiers avec statut

### 📁 Dossiers (`/dossiers`)
- Liste complète avec **recherche** et **filtre par statut**
- Création de dossier (notaires uniquement)

### 📋 Détail dossier (`/dossiers/:id`)
3 onglets :
- **Héritiers** : cartes avec avatar, part, statut contact, badge identité vérifiée + formulaire d'ajout (notaires)
- **Consentements** : liste avec barre de progression, réponses par héritier, bouton relance (notaires) + formulaire création
- **Documents** : liste des pièces jointes uploadées

### ✍️ Répondre par token (`/consentements/repondre?token=XXX`)
- Page **publique** (sans connexion)
- Affichée dans le lien email envoyé aux héritiers
- Boutons **J'accepte** / **Je refuse** avec commentaire optionnel
- Notice légale horodatage

---

## Comptes de test

| Email                    | Mot de passe | Rôle     | Accès                    |
|--------------------------|--------------|----------|--------------------------|
| admin@hericonsent.fr     | admin123     | Admin    | Tout                     |
| notaire@hericonsent.fr   | admin123     | Notaire  | Dossiers + Consentements |

---

## Design System

**Palette**
- Fond : `#f5f2ee` (crème chaud)
- Primaire : `#1a1a2e` (bleu nuit)
- Accent : `#c9a96e` / `#b8935a` (or)
- Succès : `#38a169` | Danger : `#e53e3e` | Info : `#3182ce`

**Typographie**
- Titres : `Playfair Display` (serif élégant)
- Corps : `DM Sans` (moderne et lisible)

---

*HériConsent — Débloquez votre héritage.*
