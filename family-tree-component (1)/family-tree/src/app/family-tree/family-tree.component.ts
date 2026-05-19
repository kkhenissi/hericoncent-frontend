import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy,
  ChangeDetectorRef, ViewChild, ElementRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { FamilyMember } from './family-tree.model';
import { FamilyTreeService } from './family-tree.service';
import { MemberCardComponent } from './member-card/member-card.component';
import { MemberFormComponent } from './member-form/member-form.component';

interface TreeNode {
  member: FamilyMember;
  x: number;
  y: number;
  generation: number;
}

interface Connection {
  x1: number; y1: number;
  x2: number; y2: number;
  type: 'parent-child' | 'spouse';
  coupleId?: string;
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
  @ViewChild('treeCanvas') treeCanvas!: ElementRef<SVGElement>;
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

  // Drag & Drop
  draggingId: string | null = null;
  dragOverId: string | null = null;
  isDragging = false;

  // Focus famille (après drop)
  focusedCoupleIds: Set<string> = new Set();
  focusedFamilyIds: Set<string> = new Set();
  isFamilyFocused = false;

  readonly NODE_W = 140;
  readonly NODE_H = 64;
  readonly GEN_GAP = 120;
  readonly H_GAP = 30;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    public svc: FamilyTreeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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

  // ─── Drag & Drop ────────────────────────────────────────────────

  onDragStart(event: DragEvent, nodeId: string): void {
    const member = this.svc.getById(nodeId);
    if (!member || member.gender !== 'female') {
      event.preventDefault();
      return;
    }
    this.draggingId = nodeId;
    this.isDragging = true;
    event.dataTransfer!.effectAllowed = 'link';
    event.dataTransfer!.setData('text/plain', nodeId);
    this.cdr.markForCheck();
  }

  onDragOver(event: DragEvent, nodeId: string): void {
    event.preventDefault();
    const target = this.svc.getById(nodeId);
    const dragging = this.draggingId ? this.svc.getById(this.draggingId) : null;

    // Accepter le drop uniquement sur un homme
    if (target?.gender === 'male' && dragging?.gender === 'female') {
      event.dataTransfer!.dropEffect = 'link';
      this.dragOverId = nodeId;
    } else {
      this.dragOverId = null;
    }
    this.cdr.markForCheck();
  }

  onDragLeave(event: DragEvent): void {
    this.dragOverId = null;
    this.cdr.markForCheck();
  }

  onDrop(event: DragEvent, targetId: string): void {
    event.preventDefault();
    const femaleId = this.draggingId;
    this.draggingId = null;
    this.dragOverId = null;
    this.isDragging = false;

    if (!femaleId) return;

    const female = this.svc.getById(femaleId);
    const male = this.svc.getById(targetId);

    if (!female || !male || female.gender !== 'female' || male.gender !== 'male') return;

    // Lier les deux comme couple
    this.svc.updateMember({ ...male, spouseId: femaleId });
    this.svc.updateMember({ ...female, spouseId: targetId });

    // Focus sur cette famille
    this.focusOnFamily(targetId, femaleId);
    this.cdr.markForCheck();
  }

  onDragEnd(): void {
    this.draggingId = null;
    this.dragOverId = null;
    this.isDragging = false;
    this.cdr.markForCheck();
  }

  // ─── Focus famille ────────────────────────────────────────────────

  focusOnFamily(husbandId: string, wifeId: string): void {
    const children = this.svc.getChildren(husbandId);
    this.focusedCoupleIds = new Set([husbandId, wifeId]);
    this.focusedFamilyIds = new Set([
      husbandId,
      wifeId,
      ...children.map(c => c.id),
    ]);
    this.isFamilyFocused = true;

    // Scroll vers le couple dans le SVG
    setTimeout(() => this.scrollToCouple(husbandId, wifeId), 100);
  }

  resetFocus(): void {
    this.focusedCoupleIds.clear();
    this.focusedFamilyIds.clear();
    this.isFamilyFocused = false;
    this.cdr.markForCheck();
  }

  private scrollToCouple(husbandId: string, wifeId: string): void {
    const h = this.nodes.find(n => n.member.id === husbandId);
    const w = this.nodes.find(n => n.member.id === wifeId);
    if (!h || !w || !this.svgWrapper) return;

    const centerX = ((h.x + w.x + this.NODE_W) / 2);
    const centerY = h.y + this.NODE_H / 2;
    const wrap = this.svgWrapper.nativeElement;
    wrap.scrollTo({
      left: centerX - wrap.clientWidth / 2,
      top: centerY - wrap.clientHeight / 2,
      behavior: 'smooth',
    });
  }

  // ─── Opacité des nœuds ────────────────────────────────────────────

  getNodeOpacity(id: string): number {
    if (this.isFamilyFocused) {
      return this.focusedFamilyIds.has(id) ? 1 : 0.12;
    }
    if (this.searchQuery.trim()) {
      return this.highlightedIds.has(id) ? 1 : 0.15;
    }
    if (this.filterGen !== null) {
      const node = this.nodes.find(n => n.member.id === id);
      return node?.generation === this.filterGen ? 1 : 0.15;
    }
    return 1;
  }

  isDropTarget(id: string): boolean {
    return this.dragOverId === id;
  }

  isDraggable(id: string): boolean {
    return this.svc.getById(id)?.gender === 'female';
  }

  // ─── Build tree ────────────────────────────────────────────────────

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
            x1: node.x + this.NODE_W,
            y1: node.y + this.NODE_H / 2,
            x2: spouseNode.x,
            y2: spouseNode.y + this.NODE_H / 2,
            type: 'spouse',
            coupleId: m.id + '_' + m.spouseId,
          });
        }
      }

      if (m.parentIds?.length) {
        const father = members.find(p => p.gender === 'male' && m.parentIds!.includes(p.id));
        const fatherNode = father ? nodeMap.get(father.id) : null;
        if (fatherNode) {
          this.connections.push({
            x1: fatherNode.x + this.NODE_W / 2,
            y1: fatherNode.y + this.NODE_H,
            x2: node.x + this.NODE_W / 2,
            y2: node.y,
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

  // ─── Getters ────────────────────────────────────────────────────────

  get svgWidth(): number {
    if (!this.nodes.length) return 800;
    return Math.max(800, Math.max(...this.nodes.map(n => n.x + this.NODE_W)) + 80);
  }

  get svgHeight(): number {
    if (!this.nodes.length) return 400;
    return Math.max(400, Math.max(...this.nodes.map(n => n.y + this.NODE_H)) + 80);
  }

  get filteredNodes(): TreeNode[] {
    return this.nodes;
  }

  onSearch(q: string): void {
    this.searchSubject.next(q);
  }

  selectMember(node: TreeNode): void {
    if (this.isDragging) return;
    this.selectedMember = this.selectedMember?.id === node.member.id ? null : node.member;
  }

  openAddForm(): void { this.editingMember = null; this.showForm = true; }

  openEditForm(member: FamilyMember): void {
    this.editingMember = { ...member };
    this.showForm = true;
  }

  onFormSave(member: FamilyMember): void {
    if (this.editingMember) { this.svc.updateMember(member); }
    else { this.svc.addMember({ ...member, id: Date.now().toString() }); }
    this.showForm = false;
    this.editingMember = null;
  }

  onFormCancel(): void { this.showForm = false; this.editingMember = null; }

  deleteMember(id: string): void {
    this.svc.deleteMember(id);
    if (this.selectedMember?.id === id) this.selectedMember = null;
    if (this.focusedFamilyIds.has(id)) this.resetFocus();
  }

  setFilterGen(gen: number | null): void {
    this.filterGen = this.filterGen === gen ? null : gen;
    this.resetFocus();
  }

  generations(): number[] {
    const gens = new Set(this.nodes.map(n => n.generation));
    return Array.from(gens).sort();
  }

  getLifespan(m: FamilyMember): string {
    return m.deathYear ? `${m.birthYear} – ${m.deathYear}` : `${m.birthYear}`;
  }

  trackById(_: number, node: TreeNode): string { return node.member.id; }
}
