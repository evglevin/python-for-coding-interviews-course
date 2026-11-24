import type { LessonData } from '../../types/course';

export const SECTION_9_CLASSES_AND_RECURSION: LessonData[] = [
  {
    id: 'classes-and-objects',
    sectionId: 'classes-and-recursion',
    title: 'Classes and Objects',
    blocks: [
      {
        type: 'paragraph',
        text: 'Linked-list and tree problems hand you objects like `ListNode` and `TreeNode`, and *Design* problems (*Min Stack*, *LRU Cache*, *Implement Trie*) ask you to write a whole class. A **class** bundles data (**attributes**) with the functions that operate on it (**methods**). Python has no separate `struct` — a small class is the struct.',
      },
      {
        type: 'code',
        code: `class Point:
    def __init__(self, x, y):   # constructor: runs on Point(...)
        self.x = x              # instance attributes live on self
        self.y = y

    def shift(self, dx, dy):    # regular methods take self first
        self.x += dx
        self.y += dy

    def __repr__(self):         # controls what print(p) shows
        return f"Point({self.x}, {self.y})"


p = Point(1, 2)   # no "new" keyword
p.shift(3, 4)
print(p.x, p.y)   # 4 6
print(p)          # Point(4, 6)`,
      },
      {
        type: 'list',
        items: [
          '`self` is never implicit: it must be the first parameter of every method, and attributes are always accessed as `self.x` (a bare `x` is a local variable). Calling another method also needs it: `self.shift(1, 1)`.',
          '`__init__` is the constructor. Create every attribute there, so each object gets its own attributes. Note that `self.items = items` stores a reference to the caller’s list, not a copy. Use `self.items = list(items)` when you need your own.',
          'Don’t put mutable values at class level (`class S: items = []`). That one list is **shared by every instance** — a classic bug.',
          'There are no `private`/`public` keywords. A leading underscore (`self._cache`) means “internal” by convention only.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Variables hold **references** to objects, not copies. Assigning an object to another variable (or attribute) points both at the same object — which is exactly how `node.next` and `node.left` link nodes together.',
      },
      {
        type: 'code',
        code: `a = Point(0, 0)
b = a          # b refers to the SAME object
b.x = 5
print(a.x)     # 5
print(a is b)  # True  (identity: same object)

c = Point(5, 0)
print(a is c)  # False (different objects, even with equal fields)`,
      },
      {
        type: 'note',
        title: 'LeetCode’s class Solution',
        text: 'On LeetCode, even ordinary problems are methods of `class Solution`. Helper methods you add must take `self` and be called as `self.helper(...)`, and a variable shared between methods is stored as `self.count`.',
      },
    ],
    challenge: {
      intro: 'Implement the `ParkingSystem` class (LeetCode *Design Parking System*):',
      functions: [
        {
          signature: 'ParkingSystem(big: int, medium: int, small: int)',
          description: 'Creates a parking lot with the given number of free slots for each car size. Car types are numbered `1` (big), `2` (medium) and `3` (small).',
        },
        {
          signature: 'add_car(self, car_type: int) -> bool',
          description: 'If a slot for `car_type` is free, parks the car (using up one slot) and returns `True`. Otherwise returns `False`.',
        },
        {
          signature: '__repr__(self) -> str',
          description: 'Returns the free slots in the form `ParkingSystem(big=1, medium=0, small=2)`.',
        },
      ],
      notes: ['Separate `ParkingSystem` objects must not share slots.'],
    },
    complexity: {
      time: 'O(1) for every method.',
      space: 'O(1).',
    },
    hints: [
      'In `__init__`, store the counts as instance attributes, e.g. a list `self.slots = [big, medium, small]`.',
      'In `add_car`, the slot index is `car_type - 1`. Check that `self.slots[car_type - 1] > 0`, then decrement that slot with `-= 1`.',
      'Build the `__repr__` string with an f-string: `f"ParkingSystem(big={...}, medium={...}, small={...})"`.',
    ],
    starterCode: `class ParkingSystem:
    def __init__(self, big: int, medium: int, small: int):
        pass

    def add_car(self, car_type: int) -> bool:
        pass

    def __repr__(self) -> str:
        pass


# do not modify below this line
lot = ParkingSystem(1, 1, 0)
print(lot.add_car(1))
print(lot.add_car(2))
print(lot.add_car(3))
print(lot.add_car(1))
`,
    expectedOutput: `True
True
False
False`,
    solutionCode: `class ParkingSystem:
    def __init__(self, big: int, medium: int, small: int):
        self.slots = [big, medium, small]

    def add_car(self, car_type: int) -> bool:
        i = car_type - 1
        if self.slots[i] > 0:
            self.slots[i] -= 1
            return True
        return False

    def __repr__(self) -> str:
        big, medium, small = self.slots
        return f"ParkingSystem(big={big}, medium={medium}, small={small})"


# do not modify below this line
lot = ParkingSystem(1, 1, 0)
print(lot.add_car(1))
print(lot.add_car(2))
print(lot.add_car(3))
print(lot.add_car(1))
`,
    solutionExplanation:
      '`__init__` stores the free-slot counts on `self`, so every method can read and update them through `self.slots`. Each `ParkingSystem(...)` call runs `__init__` again and gets its own list. `__repr__` is the special method Python calls for `repr(obj)` (and for `print(obj)` when there is no `__str__`).',
    testCases: [
      {
        name: 'slots run out',
        inputDisplay: 'lot = ParkingSystem(0, 2, 1); add_car(2) x3, add_car(3) x2',
        expectedDisplay: '[True, True, False, True, False]',
        testCode: `
lot = ParkingSystem(0, 2, 1)
_actual = [lot.add_car(2), lot.add_car(2), lot.add_car(2), lot.add_car(3), lot.add_car(3)]
_expected = [True, True, False, True, False]`,
      },
      {
        name: 'instances do not share slots',
        inputDisplay: 'a = ParkingSystem(1, 0, 0); b = ParkingSystem(1, 0, 0); a.add_car(1); b.add_car(1)',
        expectedDisplay: '(True, True)',
        testCode: `
a = ParkingSystem(1, 0, 0)
b = ParkingSystem(1, 0, 0)
_actual = (a.add_car(1), b.add_car(1))
_expected = (True, True)
if _actual != _expected:
    _message = 'Two ParkingSystem objects share state. Store the slots on self inside __init__, not at class level.'`,
      },
      {
        name: '__repr__ shows the free slots',
        inputDisplay: 'lot = ParkingSystem(3, 2, 1); lot.add_car(1); repr(lot)',
        expectedDisplay: "'ParkingSystem(big=2, medium=2, small=1)'",
        testCode: `
lot = ParkingSystem(3, 2, 1)
lot.add_car(1)
_actual = repr(lot)
_expected = 'ParkingSystem(big=2, medium=2, small=1)'`,
      },
    ],
  },
  {
    id: 'node-classes',
    sectionId: 'classes-and-recursion',
    title: 'Node Classes and None',
    blocks: [
      {
        type: 'paragraph',
        text: 'LeetCode defines the node classes for you, as a comment above your solution. Don’t redefine them there — just use them. A node stores a value plus **references** to other nodes, and default arguments of `None` mean “no node”.',
      },
      {
        type: 'code',
        code: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


# Nest constructor calls to build a structure in one expression.
head = ListNode(1, ListNode(2, ListNode(3)))       # 1 -> 2 -> 3

#     1
#    / \\
#   2   3
root = TreeNode(1, TreeNode(2), TreeNode(3))
root.left.left = TreeNode(4)                      # attach a node later
print(root.left.left.val)                         # 4`,
      },
      {
        type: 'paragraph',
        text: 'Chained attribute access fails on the first `None` with the most common error in node problems: `AttributeError: \'NoneType\' object has no attribute \'val\'`. Guard before you dereference.',
      },
      {
        type: 'code',
        code: `cur = head
while cur:              # a node object is truthy, None is falsy
    print(cur.val)
    cur = cur.next      # becomes None after the last node

node = root.right.left  # None: 3 has no left child
if node is not None:    # or simply: if node:
    print(node.val)`,
      },
      {
        type: 'list',
        items: [
          '`if node:` and `if node is not None:` are equivalent for these node classes (they don’t define `__bool__` or `__len__`). Use `is None` / `is not None` — never `== None` — when you want to be explicit.',
          '`Optional[TreeNode]` (from `typing`) is the type hint for “a `TreeNode` or `None`”. Python doesn’t enforce it, but LeetCode signatures use it everywhere.',
          'Python has no pointers, but object references behave like them: `prev.next = cur` sets the `next` attribute of the `prev` object to refer to the very same object as `cur`. The name `prev` itself still refers to the same node as before.',
        ],
      },
    ],
    challenge: {
      intro: 'Using the given `ListNode` and `TreeNode` classes, implement:',
      functions: [
        {
          signature: 'build_linked_list(values: List[int]) -> Optional[ListNode]',
          description: 'Returns the head of a new linked list holding `values` in order, or `None` if `values` is empty.',
        },
        {
          signature: 'to_list(head: Optional[ListNode]) -> List[int]',
          description: 'Returns the values of the linked list starting at `head` as a Python list.',
        },
        {
          signature: 'make_tree() -> TreeNode',
          description: 'Builds and returns this tree with `TreeNode` constructors: root `5`; its left child `3` has children `2` and `4`; its right child `8` has only a right child `9`.',
        },
      ],
    },
    complexity: {
      time: 'O(n) for `build_linked_list` and `to_list`; O(1) for `make_tree`.',
      space: 'O(n) for the new nodes and the returned list.',
    },
    hints: [
      '`build_linked_list`: start with `head = None` and loop over `reversed(values)`, doing `head = ListNode(v, head)`. Each new node points at the list built so far.',
      '`to_list`: `while head:` append `head.val`, then move on with `head = head.next`.',
      '`make_tree`: nest the constructors, passing `None` for a missing child: `TreeNode(8, None, TreeNode(9))`.',
    ],
    starterCode: `from typing import List, Optional


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build_linked_list(values: List[int]) -> Optional[ListNode]:
    pass


def to_list(head: Optional[ListNode]) -> List[int]:
    pass


def make_tree() -> TreeNode:
    pass


# do not modify below this line
print(to_list(build_linked_list([1, 2, 3])))
print(to_list(build_linked_list([])))
print(build_linked_list([]))

root = make_tree()
if root:
    print(root.val, root.left.val, root.right.val)
    print(root.left.left.val, root.left.right.val, root.right.left, root.right.right.val)
`,
    expectedOutput: `[1, 2, 3]
[]
None
5 3 8
2 4 None 9`,
    solutionCode: `from typing import List, Optional


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build_linked_list(values: List[int]) -> Optional[ListNode]:
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head


def to_list(head: Optional[ListNode]) -> List[int]:
    res = []
    while head:
        res.append(head.val)
        head = head.next
    return res


def make_tree() -> TreeNode:
    return TreeNode(
        5,
        TreeNode(3, TreeNode(2), TreeNode(4)),
        TreeNode(8, None, TreeNode(9)),
    )


# do not modify below this line
print(to_list(build_linked_list([1, 2, 3])))
print(to_list(build_linked_list([])))
print(build_linked_list([]))

root = make_tree()
if root:
    print(root.val, root.left.val, root.right.val)
    print(root.left.left.val, root.left.right.val, root.right.left, root.right.right.val)
`,
    solutionExplanation:
      '`build_linked_list` creates nodes back to front, so each `ListNode(v, head)` can point straight at the list built so far. An empty input never enters the loop and returns `None`. `to_list` follows `.next` until it reaches `None`, which is falsy and ends the `while` loop. `make_tree` nests constructor calls and passes `None` for the missing left child of `8`.',
    testCases: [
      {
        name: 'build creates linked ListNode objects',
        inputDisplay: 'head = build_linked_list([7, 8])',
        expectedDisplay: 'ListNode(7) -> ListNode(8) -> None',
        testCode: `
head = build_linked_list([7, 8])
_actual = head
_passed = False
if isinstance(head, ListNode) and isinstance(head.next, ListNode):
    _actual = (head.val, head.next.val, head.next.next)
    _passed = _actual == (7, 8, None)
else:
    _message = 'build_linked_list should return the head ListNode, linked to the next node through .next.'`,
      },
      {
        name: 'build a longer list',
        inputDisplay: 'build_linked_list([4, 5, 6, 7]), walked via .next',
        expectedDisplay: '[4, 5, 6, 7]',
        testCode: `
vals = []
node = build_linked_list([4, 5, 6, 7])
while isinstance(node, ListNode) and len(vals) < 10:
    vals.append(node.val)
    node = node.next
_actual = vals
_expected = [4, 5, 6, 7]`,
      },
      {
        name: 'empty input returns None',
        inputDisplay: 'build_linked_list([]), to_list(None)',
        expectedDisplay: '(None, [])',
        testCode: `
_actual = (build_linked_list([]), to_list(None))
_passed = _actual[0] is None and _actual[1] == []`,
      },
      {
        name: 'to_list on hand-built nodes',
        inputDisplay: 'to_list(ListNode(5, ListNode(6, ListNode(5))))',
        expectedDisplay: '[5, 6, 5]',
        testCode: `
_actual = to_list(ListNode(5, ListNode(6, ListNode(5))))
_expected = [5, 6, 5]`,
      },
      {
        name: 'make_tree has the exact shape',
        inputDisplay: 'make_tree()',
        expectedDisplay: '5 / (3: 2, 4), (8: None, 9)',
        testCode: `
def _shape(node):
    if node is None:
        return None
    return (node.val, _shape(node.left), _shape(node.right))

_actual = _shape(make_tree())
_expected = (5, (3, (2, None, None), (4, None, None)), (8, None, (9, None, None)))`,
      },
    ],
  },
  {
    id: 'comparing-and-hashing-objects',
    sectionId: 'classes-and-recursion',
    title: 'Comparing and Hashing Objects',
    blocks: [
      {
        type: 'paragraph',
        text: 'By default, `==` on your own objects compares **identity** (same as `is`), and every object is **hashable by identity**. That default is what node problems need: you can put nodes straight into a `set` or use them as `dict` keys, and two different nodes with equal values stay distinct.',
      },
      {
        type: 'code',
        code: `a = ListNode(1)
b = ListNode(1)
print(a == b)            # False: different objects

seen = {a}               # nodes work as set elements...
print(b in seen)         # False
copies = {a: ListNode(a.val)}   # ...and as dict keys (Clone Graph, Copy List with Random Pointer)`,
      },
      {
        type: 'paragraph',
        text: 'To compare by value or to sort objects, define **dunder** (double-underscore) methods. Python calls `__eq__` for `==`, `__lt__` for `<`, and `__hash__` for `hash()`, which `set` and `dict` use. Once a class has `__lt__`, `sorted()`, `min()` and `heapq` can compare its objects directly, with no `(priority, tiebreaker, obj)` tuples.',
      },
      {
        type: 'code',
        code: `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented    # so p == None is False, not AttributeError
        return (self.x, self.y) == (other.x, other.y)

    def __hash__(self):              # equal objects must have equal hashes
        return hash((self.x, self.y))

    def __lt__(self, other):         # used by sorted(), min(), heapq
        return (self.x, self.y) < (other.x, other.y)


print(Point(1, 2) == Point(1, 2))             # True
print(len({Point(1, 2), Point(1, 2)}))        # 1
print(min(Point(3, 0), Point(1, 9)).x)        # 1`,
      },
      {
        type: 'note',
        title: '__eq__ without __hash__ is unhashable',
        text: 'If you define `__eq__` but not `__hash__`, Python sets `__hash__` to `None`. Then `{obj}` raises `TypeError: unhashable type`. To put such objects in a set, define both methods from the same fields. Comparing tuples of fields, like `(self.x, self.y) < (other.x, other.y)`, gives you lexicographic tie-breaking for free.',
      },
      {
        type: 'paragraph',
        text: '**Never change hashed fields while the object is in a set or is a dict key.** If you do `p.x = 9` after `seen.add(p)`, the set looks in the bucket for the new hash and can no longer find or remove `p`. Hash only objects you treat as immutable. A value object you need to mutate should define `__eq__` only and stay unhashable.',
      },
      {
        type: 'paragraph',
        text: '`@dataclass` can generate all of these for you. `@dataclass(frozen=True, order=True)` writes `__init__`, `__repr__`, `__eq__`, `__hash__` and `__lt__`, comparing the fields in the order they are declared. `frozen=True` makes assigning to a field raise `FrozenInstanceError`, which keeps the hash stable. A frozen object’s list field can still be mutated in place, though, and then `hash()` fails because lists are unhashable.',
      },
      {
        type: 'code',
        code: `from dataclasses import dataclass

@dataclass(frozen=True, order=True)
class Edge:
    weight: int
    src: int
    dst: int

print(sorted([Edge(5, 0, 1), Edge(2, 1, 2)]))
# [Edge(weight=2, src=1, dst=2), Edge(weight=5, src=0, dst=1)]`,
      },
    ],
    challenge: {
      intro: 'Complete the `Task` class (its `__init__` is given) by adding these dunder methods. Don’t use `@dataclass`:',
      functions: [
        {
          signature: '__eq__(self, other) -> bool',
          description: 'Two tasks are equal when both their `priority` and `name` are equal.',
        },
        {
          signature: '__hash__(self) -> int',
          description: 'Returns a hash consistent with `__eq__`, so equal tasks collapse to one element in a `set`. Tasks are treated as immutable: their fields never change after creation.',
        },
        {
          signature: '__lt__(self, other) -> bool',
          description: 'Orders tasks by **smaller `priority` first**, breaking ties by `name` alphabetically.',
        },
      ],
    },
    complexity: {
      time: 'O(1) per comparison or hash (for short names).',
      space: 'O(1).',
    },
    hints: [
      'Compare tuples of the fields: `(self.priority, self.name) == (other.priority, other.name)`.',
      '`__hash__` can return `hash((self.priority, self.name))`.',
      '`__lt__` is the same tuple comparison with `<`. Tuples compare element by element, so ties on `priority` fall through to `name`.',
    ],
    starterCode: `import heapq


class Task:
    def __init__(self, priority: int, name: str):
        self.priority = priority
        self.name = name

    def __repr__(self) -> str:
        return f"Task({self.priority}, {self.name!r})"

    # add __eq__, __hash__ and __lt__ here


# do not modify below this line
def show(make_value):
    try:
        print(make_value())
    except TypeError as e:
        print("TypeError:", e)


def first_from_heap():
    heap = []
    for t in [Task(2, "review"), Task(1, "merge"), Task(2, "lint")]:
        heapq.heappush(heap, t)
    return heapq.heappop(heap)


show(lambda: Task(1, "deploy") == Task(1, "deploy"))
show(lambda: len({Task(1, "deploy"), Task(1, "deploy"), Task(2, "test")}))
show(lambda: sorted([Task(3, "docs"), Task(1, "fix"), Task(1, "build")]))
show(first_from_heap)
`,
    expectedOutput: `True
2
[Task(1, 'build'), Task(1, 'fix'), Task(3, 'docs')]
Task(1, 'merge')`,
    solutionCode: `import heapq


class Task:
    def __init__(self, priority: int, name: str):
        self.priority = priority
        self.name = name

    def __repr__(self) -> str:
        return f"Task({self.priority}, {self.name!r})"

    def __eq__(self, other) -> bool:
        return (self.priority, self.name) == (other.priority, other.name)

    def __hash__(self) -> int:
        return hash((self.priority, self.name))

    def __lt__(self, other) -> bool:
        return (self.priority, self.name) < (other.priority, other.name)


# do not modify below this line
def show(make_value):
    try:
        print(make_value())
    except TypeError as e:
        print("TypeError:", e)


def first_from_heap():
    heap = []
    for t in [Task(2, "review"), Task(1, "merge"), Task(2, "lint")]:
        heapq.heappush(heap, t)
    return heapq.heappop(heap)


show(lambda: Task(1, "deploy") == Task(1, "deploy"))
show(lambda: len({Task(1, "deploy"), Task(1, "deploy"), Task(2, "test")}))
show(lambda: sorted([Task(3, "docs"), Task(1, "fix"), Task(1, "build")]))
show(first_from_heap)
`,
    solutionExplanation:
      'All three methods compare the same `(priority, name)` tuple, so equality, hashing and ordering always agree. Python’s tuple comparison handles the tie-break: equal priorities fall through to the names. Because `__lt__` exists, `sorted()` and `heapq` can order `Task` objects directly.',
    testCases: [
      {
        name: 'equal tasks deduplicate in a set',
        inputDisplay: 'len({Task(5, "a"), Task(5, "a"), Task(5, "b")})',
        expectedDisplay: '2',
        testCode: `
_actual = len({Task(5, "a"), Task(5, "a"), Task(5, "b")})
_expected = 2`,
      },
      {
        name: 'tasks work as dict keys',
        inputDisplay: 'd = {Task(1, "x"): "done"}; d[Task(1, "x")]',
        expectedDisplay: "'done'",
        testCode: `
d = {Task(1, "x"): "done"}
_actual = d.get(Task(1, "x"))
_expected = "done"`,
      },
      {
        name: 'heap pops by priority, then name',
        inputDisplay: 'push Task(2, "b"), Task(1, "z"), Task(2, "a"), Task(1, "y"); pop all',
        expectedDisplay: '[(1, "y"), (1, "z"), (2, "a"), (2, "b")]',
        testCode: `
import heapq
h = []
for t in [Task(2, "b"), Task(1, "z"), Task(2, "a"), Task(1, "y")]:
    heapq.heappush(h, t)
order = []
while h:
    t = heapq.heappop(h)
    order.append((t.priority, t.name))
_actual = order
_expected = [(1, "y"), (1, "z"), (2, "a"), (2, "b")]`,
      },
      {
        name: 'different tasks are not equal',
        inputDisplay: 'Task(1, "a") == Task(2, "a"), Task(1, "a") < Task(1, "a")',
        expectedDisplay: '(False, False)',
        testCode: `
_actual = (Task(1, "a") == Task(2, "a"), Task(1, "a") < Task(1, "a"))
_expected = (False, False)`,
      },
    ],
  },
  {
    id: 'nested-functions-and-nonlocal',
    sectionId: 'classes-and-recursion',
    title: 'Nested Functions and nonlocal',
    blocks: [
      {
        type: 'paragraph',
        text: 'Tree and graph solutions usually define a recursive helper **inside** the main function. The nested function can see the outer function’s variables (a **closure**), so it doesn’t need extra parameters for the result, the `visited` set or the grid size.',
      },
      {
        type: 'code',
        code: `def all_values(root):
    res = []

    def dfs(node):          # defined inside all_values
        if not node:
            return
        res.append(node.val)  # mutating an outer list: fine
        dfs(node.left)
        dfs(node.right)

    dfs(root)
    return res`,
      },
      {
        type: 'paragraph',
        text: 'Reading an outer variable and *mutating* an outer object (`res.append`, `visited.add`) just work. But **assigning** to an outer name anywhere in the nested function makes Python treat that name as a new local variable of the nested function. `best = x` then silently creates a local and leaves the outer `best` unchanged. `count += 1` has to read the local `count` before it exists, so it raises `UnboundLocalError`. Declare the name with `nonlocal` first:',
      },
      {
        type: 'code',
        code: `def count_nodes(root):
    count = 0

    def dfs(node):
        nonlocal count      # without this: UnboundLocalError
        if not node:
            return
        count += 1
        dfs(node.left)
        dfs(node.right)

    dfs(root)
    return count`,
      },
      {
        type: 'list',
        items: [
          '`nonlocal x` refers to `x` in the nearest enclosing *function*, which must already define it, or you get a `SyntaxError`. Module-level variables need `global x` instead (rarely a good idea).',
          'Inside LeetCode’s `class Solution`, storing the value on `self` (`self.count += 1`) also works, because you are mutating an attribute, not rebinding a name.',
          'You can avoid `nonlocal` by returning values from the helper instead, e.g. `return 1 + dfs(node.left) + dfs(node.right)`.',
        ],
      },
      {
        type: 'note',
        title: 'Never use a mutable default argument',
        text: 'A default like `def dfs(node, path=[])` is created **once**, when the function is defined, and shared by every call. Paths from earlier calls leak into later ones. Use `path=None`, then `if path is None: path = []`, or keep `path` in the enclosing function.',
      },
    ],
    challenge: {
      intro: 'Using the given `TreeNode` class, implement both functions with a **nested** `dfs` helper that visits every node (node, then left subtree, then right subtree):',
      functions: [
        {
          signature: 'collect_values(root: Optional[TreeNode]) -> List[int]',
          description: 'Returns all node values in that visiting order, by appending to a list defined in the outer function.',
        },
        {
          signature: 'count_greater(root: Optional[TreeNode], x: int) -> int',
          description: 'Returns how many nodes have a value strictly greater than `x`, using an outer `count` variable updated with `nonlocal`.',
        },
      ],
    },
    complexity: {
      time: 'O(n) for both functions.',
      space: 'O(h) for the recursion stack, where h is the tree height.',
    },
    hints: [
      '`collect_values` has exactly the shape of `all_values` above.',
      '`count_greater`: set `count = 0` in the outer function, start `dfs` with `nonlocal count`, and do `count += 1` when `node.val > x`.',
      'The nested `dfs` can read `x` directly from the outer function. Only *assigning* to a name needs `nonlocal`.',
    ],
    starterCode: `from typing import List, Optional


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def collect_values(root: Optional[TreeNode]) -> List[int]:
    pass


def count_greater(root: Optional[TreeNode], x: int) -> int:
    pass


# do not modify below this line
#       4
#      / \\
#     2   7
#    / \\   \\
#   1   3   9
root = TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(7, None, TreeNode(9)))
print(collect_values(root))
print(collect_values(None))
print(count_greater(root, 3))
print(count_greater(root, 9))
print(count_greater(None, 0))
`,
    expectedOutput: `[4, 2, 1, 3, 7, 9]
[]
3
0
0`,
    solutionCode: `from typing import List, Optional


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def collect_values(root: Optional[TreeNode]) -> List[int]:
    res = []

    def dfs(node):
        if not node:
            return
        res.append(node.val)
        dfs(node.left)
        dfs(node.right)

    dfs(root)
    return res


def count_greater(root: Optional[TreeNode], x: int) -> int:
    count = 0

    def dfs(node):
        nonlocal count
        if not node:
            return
        if node.val > x:
            count += 1
        dfs(node.left)
        dfs(node.right)

    dfs(root)
    return count


# do not modify below this line
#       4
#      / \\
#     2   7
#    / \\   \\
#   1   3   9
root = TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(7, None, TreeNode(9)))
print(collect_values(root))
print(collect_values(None))
print(count_greater(root, 3))
print(count_greater(root, 9))
print(count_greater(None, 0))
`,
    solutionExplanation:
      'In `collect_values`, the nested `dfs` mutates the outer `res` list, so no declaration is needed. In `count_greater`, `count += 1` rebinds the name `count`. The `nonlocal count` line tells Python that this is the enclosing function’s variable, not a new local one. Reading `x` needs no declaration at all.',
    testCases: [
      {
        name: 'visiting order on a lopsided tree',
        inputDisplay: 'collect_values(TreeNode(1, TreeNode(2, None, TreeNode(3)), TreeNode(4)))',
        expectedDisplay: '[1, 2, 3, 4]',
        testCode: `
_actual = collect_values(TreeNode(1, TreeNode(2, None, TreeNode(3)), TreeNode(4)))
_expected = [1, 2, 3, 4]`,
      },
      {
        name: 'repeated calls start fresh',
        inputDisplay: 'collect_values(TreeNode(1)), collect_values(TreeNode(2))',
        expectedDisplay: '([1], [2])',
        testCode: `
_actual = (collect_values(TreeNode(1)), collect_values(TreeNode(2)))
_expected = ([1], [2])
if _actual != _expected:
    _message = 'Results leak between calls. Create the result list inside collect_values, not as a default argument or global.'`,
      },
      {
        name: 'empty trees',
        inputDisplay: 'collect_values(None), count_greater(None, 0)',
        expectedDisplay: '([], 0)',
        testCode: `
_actual = (collect_values(None), count_greater(None, 0))
_expected = ([], 0)`,
      },
      {
        name: 'values equal to x are not counted',
        inputDisplay: 'count_greater(TreeNode(3, TreeNode(3), TreeNode(4)), 3)',
        expectedDisplay: '1',
        testCode: `
_actual = count_greater(TreeNode(3, TreeNode(3), TreeNode(4)), 3)
_expected = 1`,
      },
      {
        name: 'count with negative values',
        inputDisplay: 'count_greater(TreeNode(-5, TreeNode(-1), TreeNode(0, TreeNode(-3))), -2)',
        expectedDisplay: '2',
        testCode: `
_actual = count_greater(TreeNode(-5, TreeNode(-1), TreeNode(0, TreeNode(-3))), -2)
_expected = 2`,
      },
      {
        name: 'repeated counts start fresh',
        inputDisplay: 'count_greater(TreeNode(5), 1) called twice',
        expectedDisplay: '(1, 1)',
        testCode: `
_actual = (count_greater(TreeNode(5), 1), count_greater(TreeNode(5), 1))
_expected = (1, 1)`,
      },
    ],
  },
  {
    id: 'recursion-limit-and-cache',
    sectionId: 'classes-and-recursion',
    title: 'Recursion Limit and @cache',
    blocks: [
      {
        type: 'paragraph',
        text: 'CPython limits recursion depth to about **1000** frames by default. A skewed tree, a long linked list or a DFS over a 100 × 100 grid can go deeper and crash with `RecursionError: maximum recursion depth exceeded`. Raise the limit once at the top of your file:',
      },
      {
        type: 'code',
        code: `import sys

sys.setrecursionlimit(10**5)

print(sys.getrecursionlimit())  # 100000`,
      },
      {
        type: 'note',
        title: 'The limit is not the real stack',
        text: '`setrecursionlimit` only moves Python’s safety check. Truly enormous depths can still exhaust the actual stack and crash the process. When depth could reach the hundreds of thousands, switch to an iterative version with an explicit stack (a `list`).',
      },
      {
        type: 'heading',
        text: 'Memoization with @cache',
      },
      {
        type: 'paragraph',
        text: 'When a recursive function is called again with the same arguments, the `@cache` decorator from `functools` stores each result and returns it instantly next time. One line turns an exponential recursion into a memoized one, with no hand-written `memo` dict.',
      },
      {
        type: 'code',
        code: `from functools import cache

@cache
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(80))           # 23416728348467685, instantly
print(fib.cache_info())  # hits, misses, current size`,
      },
      {
        type: 'list',
        items: [
          'Every argument must be **hashable**. Pass tuples, not lists: `dfs((1, 2))` works, while `dfs([1, 2])` raises `TypeError: unhashable type`.',
          '`@cache` works on nested functions too. Put it directly above the inner `def dfs(r, c):`, and it gets a fresh cache each time the outer function runs.',
          '`@lru_cache(maxsize=None)` is the older spelling (Python < 3.9) and behaves the same. `fib.cache_clear()` empties a cache.',
          'Don’t put `@cache` on a method of `class Solution`: `self` becomes part of every key. Use a nested function instead.',
        ],
      },
      {
        type: 'heading',
        text: 'How @cache works under the hood',
      },
      {
        type: 'paragraph',
        text: 'A decorator is just a function that takes a function and returns a replacement: `@cache` above `def fib` means `fib = cache(fib)`. `cache` is `lru_cache(maxsize=None)`. It returns a **wrapper** (written in C) that owns a `dict`. On every call, the wrapper builds a key from the arguments and looks it up. On a hit, it returns the stored result without running your function. On a miss, it calls the original function and stores the result. The recursive calls inside `fib` look up the name `fib`, which now refers to the wrapper, so they are cached too. This simplified pure-Python sketch shows the idea (unlike the real wrapper, it accepts positional arguments only):',
      },
      {
        type: 'code',
        code: `def my_cache(func):
    memo = {}                     # lives as long as the wrapper does

    def wrapper(*args):
        if args not in memo:      # key: the tuple of arguments
            memo[args] = func(*args)
        return memo[args]

    return wrapper


@my_cache          # same as: fib = my_cache(fib)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)`,
      },
      {
        type: 'paragraph',
        text: 'The real wrapper also adds keyword arguments to the key, *by name*. So `f(1, 2)`, `f(1, y=2)` and `f(x=1, y=2)` are three separate cache entries, even though they compute the same thing. Call a cached function the same way every time.',
      },
      {
        type: 'heading',
        text: 'Memory consequences',
      },
      {
        type: 'list',
        items: [
          '**Nothing is ever evicted.** The cache keeps one entry for every distinct argument combination it has seen. That is O(number of states) memory, the same big-O as a hand-written `memo` dict or a bottom-up DP table.',
          '**The constant factor is large.** Each entry stores a key tuple and a dict slot, plus references to the argument and result objects. We measured CPython 3.15 with `(i, j)` integer keys and small integer results: 1,000 × 1,000 entries took about **100 MB** (~106 bytes each). The lists of `[[0] * 1000 for _ in range(1000)]` take about 8 MB, because every slot refers to the one shared `0`. A table filled with large numbers needs more. A bottom-up table can also keep just the previous row (O(cols) memory). `@cache` can’t drop states it no longer needs.',
          '**A cache lives as long as its function object is reachable.** For a module-level function, that usually means until the program exits, unless you call `f.cache_clear()`. If two test cases run in the same process (LeetCode can do this), a top-level cached function keeps the first test’s entries. It even returns stale answers when the result depends on anything that isn’t an argument, like the grid. A nested cached function becomes unreachable when the outer call returns, unless you return or store it. A recursive function refers to itself, which forms a reference cycle, so it is freed later by Python’s periodic cycle collector, not the moment the outer call returns.',
          '**The cache keeps references to arguments and results.** Objects passed in or returned stay alive as long as the cache does. Every hit returns the *same* object, so if you mutate a returned list, you corrupt the cached value for all later calls. Return tuples, or copy the result.',
          '**`@lru_cache()` with no `maxsize` keeps at most 128 entries.** It limits growth by evicting the least recently used entries, but evicted DP states get recomputed, which can bring the exponential running time back. For DP, use `@cache` (or `maxsize=None`).',
        ],
      },
      {
        type: 'note',
        title: 'Memoized recursion uses more stack',
        text: 'Memoization doesn’t make recursion shallower: the first call to `fib(n)` still goes `n` levels deep. Each memoized level is also more expensive. In CPython 3.11+, a direct Python-to-Python call doesn’t consume the C stack. A call that misses the cache goes through the C wrapper back into your function, and that does. In our tests on CPython 3.15, with the limit raised to `10**6`, a plain recursive function ran 100,000 levels deep, while the same function with `@cache` failed with `RecursionError: Stack overflow`. On Pyodide, the in-browser Python this website uses, memoized recursion crashed the runtime after a few hundred levels in our tests (run under Node; browser limits differ). For deep state chains, switch to a bottom-up loop.',
      },
    ],
    challenge: {
      intro: 'Implement both functions recursively. Both receive inputs far beyond what plain recursion can handle:',
      functions: [
        {
          signature: 'grid_paths(rows: int, cols: int) -> int',
          description: 'Returns the number of paths from the top-left to the bottom-right cell of a `rows × cols` grid, moving only right or down. Use the recurrence `paths(r, c) = paths(r + 1, c) + paths(r, c + 1)`, where a cell in the last row or the last column has exactly `1` path. `rows` and `cols` are at least `1`. Memoize it with `@cache` so `grid_paths(30, 30)` is instant.',
        },
        {
          signature: 'list_length(head: Optional[ListNode]) -> int',
          description: 'Returns the number of nodes **recursively** (`0` for `None`, otherwise `1 + list_length(head.next)`). It must work on a list with 5,000 nodes.',
        },
      ],
    },
    complexity: {
      time: '`grid_paths`: O(rows × cols) with memoization (exponential without it). `list_length`: O(n).',
      space: 'O(rows × cols) for the cache; O(n) recursion depth for `list_length`.',
    },
    hints: [
      'Inside `grid_paths`, define a nested `def paths(r, c):` decorated with `@cache`, and return `paths(0, 0)`.',
      'Base case for `paths`: `if r == rows - 1 or c == cols - 1: return 1`.',
      'For `list_length`, add `sys.setrecursionlimit(10**5)` at the top of the file. 5,000 nested calls exceed the default limit of 1000.',
    ],
    starterCode: `import sys
from functools import cache
from typing import Optional


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def grid_paths(rows: int, cols: int) -> int:
    pass


def list_length(head: Optional[ListNode]) -> int:
    pass


# do not modify below this line
print(grid_paths(2, 2))
print(grid_paths(3, 7))
print(grid_paths(1, 5))
print(grid_paths(30, 30))

head = None
for i in range(5000):
    head = ListNode(i, head)
print(list_length(None))
print(list_length(ListNode(1, ListNode(2))))
print(list_length(head))
`,
    expectedOutput: `2
28
1
30067266499541040
0
2
5000`,
    solutionCode: `import sys
from functools import cache
from typing import Optional

sys.setrecursionlimit(10**5)


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def grid_paths(rows: int, cols: int) -> int:
    @cache
    def paths(r, c):
        if r == rows - 1 or c == cols - 1:
            return 1
        return paths(r + 1, c) + paths(r, c + 1)

    return paths(0, 0)


def list_length(head: Optional[ListNode]) -> int:
    if head is None:
        return 0
    return 1 + list_length(head.next)


# do not modify below this line
print(grid_paths(2, 2))
print(grid_paths(3, 7))
print(grid_paths(1, 5))
print(grid_paths(30, 30))

head = None
for i in range(5000):
    head = ListNode(i, head)
print(list_length(None))
print(list_length(ListNode(1, ListNode(2))))
print(list_length(head))
`,
    solutionExplanation:
      '`@cache` stores the result of `paths(r, c)` for every `(r, c)` pair. Each reachable `(r, c)` state is computed once (at most `rows × cols` of them), instead of an exponential number of times. Because `paths` is nested, every `grid_paths` call gets a fresh cache that also captures the right `rows` and `cols`. `list_length` recurses once per node, so the 5,000-node list needs `sys.setrecursionlimit` raised above the default of 1000.',
    testCases: [
      {
        name: 'small grids',
        inputDisplay: 'grid_paths(3, 3), grid_paths(1, 1), grid_paths(4, 2)',
        expectedDisplay: '(6, 1, 4)',
        testCode: `
_actual = (grid_paths(3, 3), grid_paths(1, 1), grid_paths(4, 2))
_expected = (6, 1, 4)`,
      },
      {
        name: 'large grid needs memoization',
        inputDisplay: 'grid_paths(40, 25)',
        expectedDisplay: '156655690918541325',
        testCode: `
_actual = grid_paths(40, 25)
_expected = 156655690918541325`,
      },
      {
        name: 'deep recursion on a 5,000-node list',
        inputDisplay: 'list_length(<5000 nodes>)',
        expectedDisplay: '5000',
        testCode: `
head = None
for i in range(5000):
    head = ListNode(i, head)
try:
    _actual = list_length(head)
except RecursionError:
    _actual = 'RecursionError'
    _message = 'Hit the default recursion limit. Call sys.setrecursionlimit(10**5) at the top of your file.'
_expected = 5000`,
      },
    ],
  },
];
