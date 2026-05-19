import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy,
  ChangeDetectorRef, ViewChild, ElementRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
  dragStartX = 0;
  dragStartY = 0;
  isDragging = false;

  // Focus famille
  focusedFamilyIds: Set<string> = new Set();
  isFamilyFocused = false;
  focusedCoupleName = '';

  readonly NODE_W = 140;
  readonly NODE_H = 64;
  readonly GEN_GAP = 120;
  readonly H_GAP = 30;

  zoomLevel = 1;
  readonly minZoom = 0.6;
  readonly maxZoom = 2;
  readonly zoomStep = 0.1;
  public svgPadding = 40;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  loading = false;
  error: string | null = null;

  constructor(
    public svc: FamilyTreeService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
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
    if (node.member.gender !== 'female') return;
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

    // Trouver le nœud homme sous le curseur
    this.dropTargetId = null;
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

    this.cdr.markForCheck();
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (!this.draggingNode) return;

    if (this.isDragging && this.dropTargetId) {
      const female = this.draggingNode.member;
      const male = this.svc.getById(this.dropTargetId);

      if (male && male.gender === 'male') {
        // Lier comme couple
        const maleWithSpouse = { ...male, spouseId: female.id };
        const femaleWithSpouse = { ...female, spouseId: male.id };
        
        this.svc.updateMember(maleWithSpouse).pipe(takeUntil(this.destroy$)).subscribe(
          () => {
            this.svc.updateMember(femaleWithSpouse).pipe(takeUntil(this.destroy$)).subscribe(
              () => {
                // Focus sur la famille
                this.focusOnFamily(male.id, female.id);
                this.cdr.markForCheck();
              },
              error => console.error('Error updating couple:', error)
            );
          },
          error => console.error('Error updating couple:', error)
        );
      }
    } else if (!this.isDragging && this.draggingNode) {
      // Simple clic → sélection
      this.selectMemberById(this.draggingNode.member.id);
    }

    this.draggingNode = null;
    this.dropTargetId = null;
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
      if (!m?.parentIds?.length) return 0;
      return 1 + Math.max(...m.parentIds.map(pid => getGen(pid, new Set(visited))));
    };

    const generationGroups = new Map<number, FamilyMember[]>();
    members.forEach(m => {
      const gen = getGen(m.id);
      if (!generationGroups.has(gen)) generationGroups.set(gen, []);
      generationGroups.get(gen)!.push(m);
    });

    const svgW = this.calculateWidth(generationGroups);

    generationGroups.forEach((group, gen) => {
      const totalW = group.length * this.NODE_W + (group.length - 1) * this.H_GAP;
      const startX = (svgW - totalW) / 2;
      group.forEach((m, i) => {
        nodeMap.set(m.id, {
          member: m,
          x: startX + i * (this.NODE_W + this.H_GAP),
          y: gen * (this.NODE_H + this.GEN_GAP) + 40,
          generation: gen,
        });
      });
    });

    this.nodes = Array.from(nodeMap.values());
    this.buildConnections(nodeMap);
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
          });
        }
      }
    });
  }

  getBentPath(c: Connection): string {
    const midY = c.y1 + (c.y2 - c.y1) / 2;
    return `M ${c.x1} ${c.y1} L ${c.x1} ${midY} L ${c.x2} ${midY} L ${c.x2} ${c.y2}`;
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
    const memberToSave = isUpdate ? member : { ...member, id: 'member_' + Date.now() };
    
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
    this.svc.deleteMember(id).pipe(takeUntil(this.destroy$)).subscribe(
      () => {
        if (this.selectedMember?.id === id) this.selectedMember = null;
        if (this.focusedFamilyIds.has(id)) this.resetFocus();
        this.cdr.markForCheck();
      },
      error => {
        this.error = 'Erreur lors de la suppression du membre';
        console.error('Error deleting member:', error);
        setTimeout(() => { this.error = null; }, 3000);
      }
    );
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
}
