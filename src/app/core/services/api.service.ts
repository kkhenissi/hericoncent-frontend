import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiResponse, AuthResponse, LoginRequest, RegisterRequest,
  Dossier, DossierDetail, CreateDossierRequest,
  Heritier, AddHeritierRequest,
  Consentement, CreateConsentementRequest, RepondreRequest
} from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ---- AUTH ----
  login(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.base}/auth/login`, req)
      .pipe(map(r => r.data));
  }

  register(req: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.base}/auth/register`, req)
      .pipe(map(r => r.data));
  }

  refreshToken(token: string): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.base}/auth/refresh`, {}, {
      headers: new HttpHeaders({ 'X-Refresh-Token': token })
    }).pipe(map(r => r.data));
  }

  // ---- DOSSIERS ----
  getDossiers(notaireId?: string): Observable<Dossier[]> {
    const url = notaireId
      ? `${this.base}/dossiers?notaireId=${encodeURIComponent(notaireId)}`
      : `${this.base}/dossiers`;
    return this.http.get<ApiResponse<Dossier[]>>(url)
      .pipe(map(r => r.data));
  }

  getDossier(id: string): Observable<DossierDetail> {
    return this.http.get<ApiResponse<DossierDetail>>(`${this.base}/dossiers/${id}`)
      .pipe(map(r => r.data));
  }

  createDossier(req: CreateDossierRequest): Observable<Dossier> {
    return this.http.post<ApiResponse<Dossier>>(`${this.base}/dossiers`, req)
      .pipe(map(r => r.data));
  }

  changerStatutDossier(id: string, statut: string): Observable<Dossier> {
    return this.http.patch<ApiResponse<Dossier>>(
      `${this.base}/dossiers/${id}/statut?statut=${statut}`, {}
    ).pipe(map(r => r.data));
  }

  // ---- HÉRITIERS ----
  getHeritiers(dossierId: string): Observable<Heritier[]> {
    return this.http.get<ApiResponse<Heritier[]>>(`${this.base}/dossiers/${dossierId}/heritiers`)
      .pipe(map(r => r.data));
  }

  addHeritier(dossierId: string, req: AddHeritierRequest): Observable<Heritier> {
    return this.http.post<ApiResponse<Heritier>>(`${this.base}/dossiers/${dossierId}/heritiers`, req)
      .pipe(map(r => r.data));
  }

  supprimerHeritier(heritierId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/heritiers/${heritierId}`)
      .pipe(map(() => void 0));
  }

  // ---- CONSENTEMENTS ----
  getConsentements(dossierId: string): Observable<Consentement[]> {
    return this.http.get<ApiResponse<Consentement[]>>(`${this.base}/dossiers/${dossierId}/consentements`)
      .pipe(map(r => r.data));
  }

  getConsentement(id: string): Observable<Consentement> {
    return this.http.get<ApiResponse<Consentement>>(`${this.base}/consentements/${id}`)
      .pipe(map(r => r.data));
  }

  createConsentement(dossierId: string, req: CreateConsentementRequest): Observable<Consentement> {
    return this.http.post<ApiResponse<Consentement>>(
      `${this.base}/dossiers/${dossierId}/consentements`, req
    ).pipe(map(r => r.data));
  }

  repondreConsentement(id: string, req: RepondreRequest): Observable<Consentement> {
    return this.http.post<ApiResponse<Consentement>>(`${this.base}/consentements/${id}/repondre`, req)
      .pipe(map(r => r.data));
  }

  repondreParToken(token: string, req: RepondreRequest): Observable<Consentement> {
    return this.http.post<ApiResponse<Consentement>>(
      `${this.base}/consentements/repondre/token/${token}`, req
    ).pipe(map(r => r.data));
  }

  relancerConsentement(id: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.base}/consentements/${id}/relancer`, {})
      .pipe(map(() => void 0));
  }

  // ---- DOCUMENTS ----
  uploadDocument(dossierId: string, file: File, typeDoc: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('typeDoc', typeDoc);
    formData.append('nom', file.name);
    return this.http.post<ApiResponse<any>>(`${this.base}/dossiers/${dossierId}/documents`, formData)
      .pipe(map(r => r.data));
  }

  // ---- FAMILY TREE ----
  getFamilyTree(dossierId: string): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.base}/dossiers/${dossierId}/family-tree`)
      .pipe(map(r => r.data));
  }

  createFamilyMember(dossierId: string, member: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(
      `${this.base}/dossiers/${dossierId}/family-tree/members`, member
    ).pipe(map(r => r.data));
  }

  updateFamilyMember(memberId: string, member: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(
      `${this.base}/family-tree/members/${memberId}`, member
    ).pipe(map(r => r.data));
  }

  deleteFamilyMember(memberId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${this.base}/family-tree/members/${memberId}`
    ).pipe(map(() => void 0));
  }
}
