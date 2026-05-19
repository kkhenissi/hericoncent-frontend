# Composant Arbre Généalogique Angular

## Structure des fichiers

```
src/app/family-tree/
├── family-tree.model.ts        # Interfaces TypeScript
├── family-tree.data.ts         # Données exemple (famille Dupont)
├── family-tree.service.ts      # Service (CRUD + recherche)
├── family-tree.component.ts    # Composant principal
├── family-tree.component.html  # Template SVG dynamique
├── family-tree.component.scss  # Styles
├── member-card/
│   └── member-card.component.ts  # Fiche détail membre
└── member-form/
    └── member-form.component.ts  # Formulaire ajout/édition
```

## Installation

1. Copier le dossier `family-tree/` dans `src/app/`

2. Importer dans votre module ou route :
```typescript
// app.routes.ts
import { FamilyTreeComponent } from './family-tree/family-tree.component';

export const routes: Routes = [
  { path: 'tree', component: FamilyTreeComponent }
];

// OU dans un module existant
import { FamilyTreeComponent } from './family-tree/family-tree.component';

@NgModule({
  imports: [FamilyTreeComponent]
})
```

3. Utiliser dans un template :
```html
<app-family-tree></app-family-tree>
```

## Fonctionnalités

- Affichage SVG dynamique multi-générations
- Recherche en temps réel (debounce 200ms)
- Filtrage par génération
- Clic sur un nœud → fiche détail
- Ajout / modification / suppression de membres
- Connexions parent-enfant (trait plein) et couple (trait pointillé rose)
- Reactive via BehaviorSubject (mise à jour instantanée)
- OnPush ChangeDetection (performance)

## Personnalisation des données

Éditez `family-tree.data.ts` ou injectez vos propres données via le service :

```typescript
constructor(private svc: FamilyTreeService) {
  // Remplacer les données par défaut
  svc.addMember({ id: 'jean', firstName: 'Jean', ... });
}
```

## Connexion à votre API (hericonsent)

```typescript
// family-tree.service.ts — remplacer FAMILY_DATA par un appel HTTP
constructor(private http: HttpClient) {
  this.http.get<FamilyMember[]>('/api/dossier/{id}/heritiers')
    .subscribe(data => this.membersSubject.next(data));
}
```
