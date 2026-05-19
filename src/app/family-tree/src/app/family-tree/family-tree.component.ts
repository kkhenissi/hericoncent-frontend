import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy,
  ChangeDetectorRef, ViewChild, ElementRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { FamilyMember } from './family-tree.model';
import { FamilyTreeService } from './family-tree.service';
import { MemberCardComponent } from './member-card/member-card.component';
import { MemberFormComponent } from './member-form/member-form.component';

export interface TreeNode {
  member: FamilyMember;
  x: number;
  y: number;
  generation: number;
}

export interface Connection {
  x1: number; y1: number;
  x2: number; y2: number;
  type: 'parent-child' | 'spouse';
  parentId?: string;
}

@Component({
  selector: 'app-family-tree',
  standalone: true,
  imports: [CommonModule, FormsModule, MemberCardComponent, MemberFormComponent],
  templateUrl: './family-tree.component.html',
  styleUrls: ['./family-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyTreeComponent implements OnInit, OnDestroy {
  @ViewChild('svgEl') svgEl!: ElementRef<SVGSVGElement>;
  @ViewChild('svgWrapper') svgWrapper!: ElementRef<HTMLDivElement>;

  nodes: TreeNode[] = [];
  connections: Connection[] = [];
  selectedMember: FamilyMember | null = null;
  showForm = false;
  editingMember: FamilyMember | null = null;
  searchQuery = '';
  highlightedIds = new Set<string>();
  filterGen: number | null = null;
  allMembers: FamilyMember[] = [];

  // Drag state
  draggingNode: TreeNode | null = null;
  ghostX = 0;
  ghostY = 0;
  dropTargetId: string | null = null;
  dropTargetCouple: { maleId: string; femaleId: string } | null = null;
  dragStartX = 0;
  dragStartY = 0;
  isDragging = false;

  // Focus famille
  focusedFamilyIds: Set<string> = new Set();
  isFamilyFocused = false;
  focusedCoupleName = '';

  readonly NODE_W = 120;
  readonly NODE_H = 55;
  readonly GEN_GAP = 120;
  readonly H_GAP = 30;

  zoomLevel = 1;
  readonly minZoom = 0.6;
  readonly maxZoom = 2;
  readonly zoomStep = 0.1;
  public svgPadding = 40;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  private history: FamilyMember[][] = [];
  private historyIndex = -1;
  loading = false;
  error: string | null = null;
  canUndo = false;

  constructor(
    public svc: FamilyTreeService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get dossierId from route params if available
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const dossierId = params.get('dossierId');
      this.loading = true;
      this.error = null;
      this.svc.setDossier(dossierId);
      setTimeout(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }, 500);
    });

    this.svc.members$.pipe(takeUntil(this.destroy$)).subscribe(members => {
      this.allMembers = members;
      this.buildTree();
      this.cdr.markForCheck();
    });

    this.searchSubject.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(q => {
      if (!q.trim()) { this.highlightedIds.clear(); }
      else {
        const results = this.svc.search(q);
        this.highlightedIds = new Set(results.map(r => r.id));
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Drag via mousedown/mousemove/mouseup ─────────────────────────

  onMouseDown(event: MouseEvent, node: TreeNode): void {
    event.preventDefault();

    this.draggingNode = node;
    this.isDragging = false;

    const svgRect = this.svgEl.nativeElement.getBoundingClientRect();
    const zoom = this.zoomLevel;
    this.ghostX = (event.clientX - svgRect.left) / zoom;
    this.ghostY = (event.clientY - svgRect.top) / zoom;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    this.cdr.markForCheck();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.draggingNode) return;

    const dx = Math.abs(event.clientX - this.dragStartX);
    const dy = Math.abs(event.clientY - this.dragStartY);
    if (dx > 3 || dy > 3) this.isDragging = true;

    const svgRect = this.svgEl.nativeElement.getBoundingClientRect();
    const zoom = this.zoomLevel;
    this.ghostX = (event.clientX - svgRect.left) / zoom;
    this.ghostY = (event.clientY - svgRect.top) / zoom;

    // Trouver le nœud homme ou la liaison sous le curseur
    this.dropTargetId = null;
    this.dropTargetCouple = null;

    // Vérifier les liaisons (pour ajouter un enfant à un couple)
    const tolerance = 10;
    for (const connection of this.connections) {
      const dist = this.distanceToLine(this.ghostX, this.ghostY, connection.x1, connection.y1, connection.x2, connection.y2);
      if (dist < tolerance) {
        if (connection.type === 'spouse') {
          // Trouver le couple (homme et femme)
          const maleNode = this.nodes.find(n => Math.abs(n.x + this.NODE_W - connection.x1) < 2);
          const femaleNode = this.nodes.find(n => Math.abs(n.x - connection.x2) < 2);
          if (maleNode && femaleNode) {
            this.dropTargetCouple = { maleId: maleNode.member.id, femaleId: femaleNode.member.id };
            break;
          }
        }
      }
    }

    // Sinon, chercher un nœud homme pour lier comme couple
    if (!this.dropTargetCouple) {
      for (const node of this.nodes) {
        if (node.member.gender !== 'male') continue;
        if (
          this.ghostX >= node.x && this.ghostX <= node.x + this.NODE_W &&
          this.ghostY >= node.y && this.ghostY <= node.y + this.NODE_H
        ) {
          this.dropTargetId = node.member.id;
          break;
        }
      }
    }

    this.cdr.markForCheck();
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (!this.draggingNode) return;

    const dossierId = this.svc.getCurrentDossierId();

    // Cas 1: Dragger sur une liaison pour ajouter/modifier les parents
    if (this.isDragging && this.dropTargetCouple) {
      const member = this.draggingNode.member;
      console.log('🎯 Drag sur liaison - Membre:', member.firstName, member.lastName);
      console.log('   Parents actuels:', member.parentIds);
      console.log('   Couple cible:', this.dropTargetCouple);

      // Vérifier si le membre a déjà des parents
      if (member.parentIds && member.parentIds.length > 0) {
        // Demander confirmation pour remplacer les parents
        const children = this.svc.getChildren(member.id);
        const hasChildren = children.length > 0;
        console.log('   Enfants détectés:', children.length);

        const message = hasChildren
          ? `${member.firstName} ${member.lastName} a ${children.length} enfant(s). Voulez-vous ajouter des parents et créer une nouvelle généra-parent ?`
          : `${member.firstName} ${member.lastName} a déjà des parents. Voulez-vous les modifier ?`;

        if (confirm(message)) {
          console.log('✅ Confirmation accordée - Ajout des parents');
          this.addParentsToMember(dossierId, member.id, this.dropTargetCouple.maleId, this.dropTargetCouple.femaleId);
        } else {
          console.log('❌ Confirmation refusée');
        }
      } else {
        // Pas de parents, ajouter simplement les nouveaux parents
        console.log('✅ Pas de parents actuels - Ajout des nouveaux parents');
        this.addParentsToMember(dossierId, member.id, this.dropTargetCouple.maleId, this.dropTargetCouple.femaleId);
      }
    }
    // Cas 2: Dragger une femme sur un homme pour les lier
    else if (this.isDragging && this.dropTargetId) {
      const female = this.draggingNode.member;
      const male = this.svc.getById(this.dropTargetId);

      if (male && male.gender === 'male' && female.gender === 'female') {
        if (!dossierId) {
          console.error('Dossier ID not available');
          return;
        }
        // Lier comme couple via API
        this.saveState();
        this.apiService.linkCouple(dossierId, male.id, female.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              // Mettre à jour les données locales
              const updatedMale = { ...male, spouseId: female.id };
              const updatedFemale = { ...female, spouseId: male.id };

              const current = this.allMembers.map(m =>
                m.id === male.id ? updatedMale : (m.id === female.id ? updatedFemale : m)
              );
              this.allMembers = current;
              this.svc['membersSubject'].next(current);

              // Focus sur la famille
              this.focusOnFamily(male.id, female.id);
              this.cdr.markForCheck();
            },
            error: (err: any) => {
              console.error('Erreur lors de la création du couple:', err);
              alert('Erreur lors de la création du couple');
            }
          });
      }
    } else if (this.isDragging && this.draggingNode) {
      // Drag horizontal sans drop target → réorganiser l'ordre des frères
      this.reorderSiblings(this.draggingNode);
    } else if (!this.isDragging && this.draggingNode) {
      // Simple clic → sélection
      this.selectMemberById(this.draggingNode.member.id);
    }

    this.draggingNode = null;
    this.dropTargetId = null;
    this.dropTargetCouple = null;
    this.isDragging = false;
    this.cdr.markForCheck();
  }

  // ─── Focus famille ─────────────────────────────────────────────────

  focusOnFamily(husbandId: string, wifeId: string): void {
    const children = this.svc.getChildren(husbandId);
    this.focusedFamilyIds = new Set([
      husbandId, wifeId,
      ...children.map(c => c.id),
    ]);
    this.isFamilyFocused = true;

    const husband = this.svc.getById(husbandId);
    const wife = this.svc.getById(wifeId);
    if (husband && wife) {
      this.focusedCoupleName = `${husband.firstName} & ${wife.firstName}`;
    }

    // Scroll vers le couple
    setTimeout(() => {
      const hNode = this.nodes.find(n => n.member.id === husbandId);
      const wNode = this.nodes.find(n => n.member.id === wifeId);
      if (!hNode || !wNode || !this.svgWrapper) return;
      const cx = (hNode.x + wNode.x + this.NODE_W) / 2;
      const cy = hNode.y + this.NODE_H / 2;
      const wrap = this.svgWrapper.nativeElement;
      wrap.scrollTo({ left: cx * this.zoomLevel - wrap.clientWidth / 2, top: cy * this.zoomLevel - 80, behavior: 'smooth' });
    }, 100);

    this.cdr.markForCheck();
  }

  resetFocus(): void {
    this.focusedFamilyIds.clear();
    this.isFamilyFocused = false;
    this.focusedCoupleName = '';
    this.cdr.markForCheck();
  }

  // ─── Opacité ───────────────────────────────────────────────────────

  getNodeOpacity(id: string): number {
    if (this.isFamilyFocused) return this.focusedFamilyIds.has(id) ? 1 : 0.1;
    if (this.searchQuery.trim()) return this.highlightedIds.has(id) ? 1 : 0.15;
    if (this.filterGen !== null) {
      const node = this.nodes.find(n => n.member.id === id);
      return node?.generation === this.filterGen ? 1 : 0.15;
    }
    return 1;
  }

  getConnectionOpacity(c: Connection): number {
    if (!this.isFamilyFocused) return 1;
    if (c.type === 'spouse') {
      const n1 = this.nodes.find(n => Math.abs(n.x + this.NODE_W - c.x1) < 2 || Math.abs(n.x - c.x2) < 2);
      return n1 && this.focusedFamilyIds.has(n1.member.id) ? 1 : 0.08;
    }
    return 0.08;
  }

  // ─── Tree building ─────────────────────────────────────────────────

  buildTree(): void {
    const members = this.svc.getAll();
    const nodeMap = new Map<string, TreeNode>();

    const getGen = (id: string, visited = new Set<string>()): number => {
      if (visited.has(id)) return 0;
      visited.add(id);
      const m = this.svc.getById(id);

      if (m?.parentIds?.length) {
        return 1 + Math.max(...m.parentIds.map(pid => getGen(pid, new Set(visited))));
      }

      if (m?.spouseId) {
        return getGen(m.spouseId, new Set(visited));
      }

      return 0;
    };

    const generationGroups = new Map<number, FamilyMember[]>();
    members.forEach(m => {
      const gen = getGen(m.id);
      if (!generationGroups.has(gen)) generationGroups.set(gen, []);
      generationGroups.get(gen)!.push(m);
    });

    const svgW = this.calculateWidth(generationGroups);

    generationGroups.forEach((group, gen) => {
      group.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      console.log(`Génération ${gen}:`, group.map(m => `${m.firstName} (parents: ${m.parentIds?.join(',') || 'none'})`));

      // Créer des paires (couple ou individu seul)
      const processed = new Set<string>();
      const couples: (FamilyMember[])[] = [];
      group.forEach(m => {
        if (processed.has(m.id)) return;
        processed.add(m.id);
        const spouse = m.spouseId ? group.find(s => s.id === m.spouseId) : null;
        if (spouse && !processed.has(spouse.id)) {
          processed.add(spouse.id);
          couples.push([m, spouse]);
        } else {
          couples.push([m]);
        }
      });

      const coupleSpacing = 15;
      const coupleWidths = couples.map(couple => {
        return couple.length === 2
          ? this.NODE_W + coupleSpacing + this.NODE_W
          : this.NODE_W;
      });

      const totalW = coupleWidths.reduce((a, b) => a + b, 0) + (couples.length - 1) * this.H_GAP;
      const startX = Math.max(0, (svgW - totalW) / 2);

      // Grouper les enfants par père pour décaler verticalement
      const childGroupsByFather = new Map<string, number>();
      let fatherCount = 0;

      couples.forEach(couple => {
        const fatherId = couple[0].parentIds?.[0];
        if (fatherId && !childGroupsByFather.has(fatherId)) {
          childGroupsByFather.set(fatherId, fatherCount * 20);
          fatherCount++;
        }
      });

      let xOffset = startX;
      couples.forEach((couple, idx) => {
        const fatherId = couple[0].parentIds?.[0];
        const yOffset = fatherId ? (childGroupsByFather.get(fatherId) ?? 0) : 0;
        const baseY = gen * (this.NODE_H + this.GEN_GAP) + 40 + yOffset;

        if (couple.length === 2) {
          nodeMap.set(couple[0].id, {
            member: couple[0],
            x: xOffset,
            y: baseY,
            generation: gen,
          });
          nodeMap.set(couple[1].id, {
            member: couple[1],
            x: xOffset + this.NODE_W + coupleSpacing,
            y: baseY,
            generation: gen,
          });
          xOffset += coupleWidths[idx] + this.H_GAP;
        } else {
          nodeMap.set(couple[0].id, {
            member: couple[0],
            x: xOffset,
            y: baseY,
            generation: gen,
          });
          xOffset += coupleWidths[idx] + this.H_GAP;
        }
      });
    });

    this.nodes = Array.from(nodeMap.values());
    this.buildConnections(nodeMap);
  }

  private getSubtreeWidth(memberId: string, visited = new Set<string>()): number {
    if (visited.has(memberId)) return this.NODE_W;
    visited.add(memberId);

    const children = this.svc.getChildren(memberId);
    if (children.length === 0) return this.NODE_W;

    const childrenWidth = children.reduce((sum, child) =>
      sum + this.getSubtreeWidth(child.id, new Set(visited)), 0
    );
    const spacing = (children.length - 1) * this.H_GAP;
    return Math.max(this.NODE_W, childrenWidth + spacing);
  }

  private calculateWidth(groups: Map<number, FamilyMember[]>): number {
    let maxCount = 0;
    groups.forEach(g => { if (g.length > maxCount) maxCount = g.length; });
    return Math.max(700, maxCount * (this.NODE_W + this.H_GAP) + 100);
  }

  private buildConnections(nodeMap: Map<string, TreeNode>): void {
    this.connections = [];
    const members = this.svc.getAll();

    members.forEach(m => {
      const node = nodeMap.get(m.id);
      if (!node) return;

      if (m.spouseId && m.gender === 'male') {
        const spouseNode = nodeMap.get(m.spouseId);
        if (spouseNode) {
          this.connections.push({
            x1: node.x + this.NODE_W, y1: node.y + this.NODE_H / 2,
            x2: spouseNode.x, y2: spouseNode.y + this.NODE_H / 2,
            type: 'spouse',
          });
        }
      }

      if (m.parentIds?.length) {
        const father = members.find(p => p.gender === 'male' && m.parentIds!.includes(p.id));
        const fatherNode = father ? nodeMap.get(father.id) : null;
        if (fatherNode) {
          this.connections.push({
            x1: fatherNode.x + this.NODE_W / 2, y1: fatherNode.y + this.NODE_H,
            x2: node.x + this.NODE_W / 2, y2: node.y,
            type: 'parent-child',
            parentId: father?.id
          });
        }
      }
    });
  }

  getBentPath(c: Connection): string {
    const midY = c.y1 + (c.y2 - c.y1) / 2;
    return `M ${c.x1} ${c.y1} L ${c.x1} ${midY} L ${c.x2} ${midY} L ${c.x2} ${c.y2}`;
  }

  getColorForParent(parentId?: string): string {
    if (!parentId) return 'rgba(100,116,139,0.75)';
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
      '#06b6d4', '#6366f1', '#14b8a6', '#f97316'
    ];
    const hash = parentId.charCodeAt(0) + parentId.charCodeAt(parentId.length - 1);
    return colors[hash % colors.length];
  }
  get zoomLabel(): string {
    return `${Math.round(this.zoomLevel * 100)}%`;
  }

  zoomIn(): void {
    this.setZoom(this.zoomLevel + this.zoomStep);
  }

  zoomOut(): void {
    this.setZoom(this.zoomLevel - this.zoomStep);
  }

  resetZoom(): void {
    this.zoomLevel = 1;
    this.cdr.markForCheck();
  }

  private setZoom(value: number): void {
    this.zoomLevel = Math.min(this.maxZoom, Math.max(this.minZoom, +value.toFixed(2)));
    this.cdr.markForCheck();
  }
  // ─── Helpers ───────────────────────────────────────────────────────

  get svgWidth(): number {
    if (!this.nodes.length) return 800;
    return Math.max(800, Math.max(...this.nodes.map(n => n.x + this.NODE_W)) + 80);
  }

  get svgHeight(): number {
    if (!this.nodes.length) return 400;
    return Math.max(400, Math.max(...this.nodes.map(n => n.y + this.NODE_H)) + 80);
  }

  get ghostVisible(): boolean {
    return !!this.draggingNode && this.isDragging;
  }

  private saveState(): void {
    // Garder seulement les états jusqu'à l'index actuel (supprimer les "redo")
    this.history = this.history.slice(0, this.historyIndex + 1);
    // Ajouter le nouvel état
    this.history.push(JSON.parse(JSON.stringify(this.allMembers)));
    this.historyIndex++;
    this.canUndo = this.historyIndex > 0;
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const previousState = this.history[this.historyIndex];
      this.allMembers = JSON.parse(JSON.stringify(previousState));
      this.svc['membersSubject'].next(this.allMembers);
      this.buildTree();
      this.canUndo = this.historyIndex > 0;
      this.cdr.markForCheck();
    }
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  onSearch(q: string): void { this.searchSubject.next(q); }

  selectMemberById(id: string): void {
    const member = this.svc.getById(id);
    this.selectedMember = this.selectedMember?.id === id ? null : (member ?? null);
  }

  selectMember(node: TreeNode): void {
    this.selectMemberById(node.member.id);
  }

  openAddForm(): void { this.editingMember = null; this.showForm = true; }

  openEditForm(m: FamilyMember): void { this.editingMember = { ...m }; this.showForm = true; }

  onFormSave(member: FamilyMember): void {
    const isUpdate = !!this.editingMember;
    const memberToSave = isUpdate ? member : { ...member, id: this.generateUUID() };

    this.saveState();
    const operation = isUpdate
      ? this.svc.updateMember(memberToSave)
      : this.svc.addMember(memberToSave);

    operation.pipe(takeUntil(this.destroy$)).subscribe(
      () => {
        this.showForm = false;
        this.editingMember = null;
        this.cdr.markForCheck();
      },
      error => {
        this.error = 'Erreur lors de l\'enregistrement du membre';
        console.error('Error saving member:', error);
        setTimeout(() => { this.error = null; }, 3000);
      }
    );
  }

  onFormCancel(): void { this.showForm = false; this.editingMember = null; }

  deleteMember(id: string): void {
    this.saveState();
    this.svc.deleteMember(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (this.selectedMember?.id === id) this.selectedMember = null;
        if (this.focusedFamilyIds.has(id)) this.resetFocus();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.error = 'Erreur lors de la suppression du membre';
        console.error('Error deleting member:', err);
        setTimeout(() => { this.error = null; }, 3000);
      }
    });
  }

  private reorderSiblings(draggedNode: TreeNode): void {
    const member = draggedNode.member;
    const siblings = this.allMembers.filter(m =>
      m.id !== member.id &&
      JSON.stringify(m.parentIds || []) === JSON.stringify(member.parentIds || [])
    );

    if (siblings.length === 0) return;

    const allInGroup = [member, ...siblings];

    // Créer des paires (couple ou individu seul)
    const processed = new Set<string>();
    const pairs: FamilyMember[][] = [];

    allInGroup.forEach(m => {
      if (processed.has(m.id)) return;

      processed.add(m.id);
      const spouse = m.spouseId ? allInGroup.find(s => s.id === m.spouseId) : null;

      if (spouse && !processed.has(spouse.id)) {
        processed.add(spouse.id);
        pairs.push([m, spouse]);
      } else {
        pairs.push([m]);
      }
    });

    // Trier les paires par leur position X moyenne
    const pairNodes = pairs.map(pair => {
      const x0 = this.nodes.find(n => n.member.id === pair[0].id)?.x ?? 0;
      const x1 = pair.length === 2 ? (this.nodes.find(n => n.member.id === pair[1].id)?.x ?? 0) : x0;
      const avgX = pair.length === 2 ? (x0 + x1) / 2 : x0;
      return { pair, avgX };
    });

    pairNodes.sort((a, b) => a.avgX - b.avgX);

    this.saveState();

    // Réassigner les displayOrder
    let orderIdx = 0;
    pairNodes.forEach(({ pair }) => {
      pair.forEach(m => {
        const updated = { ...m, displayOrder: orderIdx };
        const idx = this.allMembers.findIndex(am => am.id === m.id);
        if (idx >= 0) this.allMembers[idx] = updated;
        orderIdx++;
      });
    });

    this.svc['membersSubject'].next(this.allMembers);
    this.buildTree();
  }

  private addParentsToMember(dossierId: string | null, memberId: string, maleParentId: string, femaleParentId: string): void {
    if (!dossierId) {
      console.error('Dossier ID not available');
      return;
    }

    const member = this.svc.getById(memberId);
    if (!member) return;

    const maleParent = this.svc.getById(maleParentId);
    const femaleParent = this.svc.getById(femaleParentId);

    if (!maleParent || !femaleParent) {
      console.error('Parents not found');
      return;
    }

    const updatedMember: FamilyMember = {
      ...member,
      parentIds: [maleParentId, femaleParentId]
    };

    // Si le membre avait déjà un père, mettre à jour aussi les frères
    const oldFatherId = member.parentIds?.[0];
    const siblings = oldFatherId
      ? this.allMembers.filter(m =>
          m.id !== memberId &&
          m.parentIds?.includes(oldFatherId) &&
          !m.parentIds?.includes(femaleParentId)
        )
      : [];

    // Trouver tous les enfants du père (existants et à mettre à jour)
    const allChildrenOfFather = this.allMembers.filter(m =>
      m.id !== memberId &&
      m.parentIds?.includes(maleParentId)
    );

    // Assigner un displayOrder au nouvel enfant (à la fin)
    const maxDisplayOrder = Math.max(
      0,
      ...allChildrenOfFather.map(m => m.displayOrder ?? 0)
    );

    const updatedMemberWithOrder: FamilyMember = {
      ...updatedMember,
      displayOrder: maxDisplayOrder + 1
    };

    // Mettre à jour aussi les enfants existants avec les deux parents
    const childrenWithOrder: FamilyMember[] = allChildrenOfFather.map(child => ({
      ...child,
      parentIds: [maleParentId, femaleParentId]
    } as FamilyMember)).concat([updatedMemberWithOrder]);

    const updatedSiblings = siblings.map(s => ({
      ...s,
      parentIds: [maleParentId, femaleParentId]
    }));

    console.log(`🎯 Updating ${member.firstName} with parents:`, [maleParentId, femaleParentId]);
    if (updatedSiblings.length > 0) {
      console.log(`   + ${updatedSiblings.length} siblings also updated`);
    }

    this.saveState();
    this.svc.updateMember(updatedMember).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        let current = this.allMembers.map(m => m.id === memberId ? updatedMember : m);

        // Mettre à jour les enfants avec leur displayOrder séquentiel
        childrenWithOrder.forEach(child => {
          current = current.map(m => m.id === child.id ? child : m);
          if (child.id !== memberId) {
            this.svc.updateMember(child).pipe(takeUntil(this.destroy$)).subscribe();
          }
        });

        // Mettre à jour aussi les frères
        updatedSiblings.forEach(sibling => {
          current = current.map(m => m.id === sibling.id ? sibling : m);
          this.svc.updateMember(sibling).pipe(takeUntil(this.destroy$)).subscribe();
        });

        this.allMembers = current;
        this.svc['membersSubject'].next(current);
        this.buildTree();
        this.focusOnFamily(maleParentId, femaleParentId);
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('Erreur lors de l\'ajout des parents:', err);
        alert('Erreur lors de l\'ajout des parents');
      }
    });
  }

  setFilterGen(gen: number | null): void {
    this.filterGen = this.filterGen === gen ? null : gen;
    this.resetFocus();
  }

  generations(): number[] {
    return Array.from(new Set(this.nodes.map(n => n.generation))).sort();
  }

  getLifespan(m: FamilyMember): string {
    return m.deathYear ? `${m.birthYear}–${m.deathYear}` : `${m.birthYear}`;
  }

  trackById(_: number, node: TreeNode): string { return node.member.id; }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private distanceToLine(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
