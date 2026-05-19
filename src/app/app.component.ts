import { Component, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="app-shell" [class.auth-mode]="!auth.isLoggedIn()">
      <!-- SIDEBAR -->
      @if (auth.isLoggedIn()) {
        <aside class="sidebar">
          <div class="sidebar-brand">
            <div class="brand-icon">⚖</div>
            <div>
              <div class="brand-name">HériConsent</div>
              <div class="brand-sub">Plateforme successorale</div>
            </div>
          </div>

          <nav class="sidebar-nav">
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">◈</span>
              <span>Tableau de bord</span>
            </a>
            <a routerLink="/dossiers" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">⊟</span>
              <span>Dossiers</span>
            </a>
          </nav>

          <div class="sidebar-footer">
            <div class="user-badge">
              <div class="user-avatar">{{ userInitial() }}</div>
              <div class="user-info">
                <div class="user-email">{{ auth.currentUser()?.email }}</div>
                <div class="user-role">{{ roleLabel() }}</div>
              </div>
            </div>
            <button class="logout-btn" (click)="auth.logout()">Déconnexion</button>
          </div>
        </aside>
      }

      <!-- MAIN CONTENT -->
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

    :host { display: block; height: 100vh; }

    .app-shell {
      display: flex;
      height: 100vh;
      background: #f5f2ee;
      font-family: 'DM Sans', sans-serif;
    }

    .auth-mode { background: #1a1a2e; }

    /* SIDEBAR */
    .sidebar {
      width: 260px;
      min-width: 260px;
      background: #1a1a2e;
      display: flex;
      flex-direction: column;
      padding: 0;
      box-shadow: 4px 0 24px rgba(0,0,0,0.15);
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 28px 24px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }

    .brand-icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #c9a96e, #e8c98a);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }

    .brand-name {
      font-family: 'Playfair Display', serif;
      font-size: 16px; font-weight: 700;
      color: #fff; letter-spacing: 0.3px;
    }

    .brand-sub {
      font-size: 10px; color: rgba(255,255,255,0.4);
      text-transform: uppercase; letter-spacing: 1px;
    }

    .sidebar-nav {
      flex: 1;
      padding: 20px 16px;
      display: flex; flex-direction: column; gap: 4px;
    }

    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      color: rgba(255,255,255,0.55);
      text-decoration: none;
      font-size: 14px; font-weight: 500;
      transition: all 0.2s;
    }

    .nav-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
    .nav-item.active {
      background: linear-gradient(135deg, rgba(201,169,110,0.2), rgba(232,201,138,0.1));
      color: #c9a96e;
      border: 1px solid rgba(201,169,110,0.25);
    }

    .nav-icon { font-size: 16px; width: 20px; text-align: center; }

    .sidebar-footer {
      padding: 20px;
      border-top: 1px solid rgba(255,255,255,0.07);
    }

    .user-badge {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 12px;
    }

    .user-avatar {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #c9a96e, #e8c98a);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; color: #1a1a2e;
    }

    .user-email {
      font-size: 12px; color: rgba(255,255,255,0.7);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-width: 140px;
    }

    .user-role {
      font-size: 10px; color: #c9a96e;
      text-transform: uppercase; letter-spacing: 0.8px;
    }

    .logout-btn {
      width: 100%;
      padding: 9px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: rgba(255,255,255,0.5);
      font-size: 12px; cursor: pointer;
      transition: all 0.2s;
    }

    .logout-btn:hover {
      background: rgba(220,80,80,0.15);
      border-color: rgba(220,80,80,0.3);
      color: #e88;
    }

    /* MAIN */
    .main-content {
      flex: 1;
      overflow-y: auto;
      background: #f5f2ee;
    }
  `]
})
export class AppComponent {
  constructor(public auth: AuthService) {}

  userInitial = computed(() => {
    const email = this.auth.currentUser()?.email ?? '';
    return email.charAt(0).toUpperCase();
  });

  roleLabel = computed(() => {
    const role = this.auth.currentUser()?.role ?? '';
    const map: Record<string, string> = {
      ROLE_ADMIN: 'Administrateur',
      ROLE_NOTAIRE: 'Notaire',
      ROLE_HEIR: 'Héritier'
    };
    return map[role] ?? role;
  });
}
