import type { Lesson, Section } from '../types/course';
import { SECTION_1_SORTING } from './sections/section1-sorting';
import { SECTION_2_PYTHONIC } from './sections/section2-pythonic';
import { SECTION_3_LISTS } from './sections/section3-lists';
import { SECTION_4_STACKS_QUEUES } from './sections/section4-stacks-queues';
import { SECTION_5_2D_LISTS } from './sections/section5-2d-lists';
import { SECTION_6_HASHMAPS_HASHSETS } from './sections/section6-hashmaps-hashsets';
import { SECTION_7_HEAPS } from './sections/section7-heaps';
import { SECTION_8_SORTED_CONTAINERS } from './sections/section8-sorted-containers';
import { SECTION_9_CLASSES_AND_RECURSION } from './sections/section9-classes-and-recursion';

export const SECTIONS: Section[] = [
  { id: 'sorting', number: 1, shortTitle: 'Sorting' },
  { id: 'pythonic-code', number: 2, shortTitle: 'Pythonic Code' },
  { id: 'lists', number: 3, shortTitle: 'Lists' },
  { id: 'stacks-and-queues', number: 4, shortTitle: 'Stacks and Queues' },
  { id: '2d-lists', number: 5, shortTitle: '2-D Lists' },
  { id: 'hashmaps-and-hashsets', number: 6, shortTitle: 'Hashmaps and Hashsets' },
  { id: 'heaps', number: 7, shortTitle: 'Heaps / Priority Queues' },
  { id: 'sorted-dicts-and-sets', number: 8, shortTitle: 'Sorted Dicts and Sorted Sets' },
  { id: 'classes-and-recursion', number: 9, shortTitle: 'Classes and Recursion' },
];

export const LESSONS: Lesson[] = [
  ...SECTION_1_SORTING,
  ...SECTION_2_PYTHONIC,
  ...SECTION_3_LISTS,
  ...SECTION_4_STACKS_QUEUES,
  ...SECTION_5_2D_LISTS,
  ...SECTION_6_HASHMAPS_HASHSETS,
  ...SECTION_7_HEAPS,
  ...SECTION_8_SORTED_CONTAINERS,
  ...SECTION_9_CLASSES_AND_RECURSION,
].map((lesson, index) => ({ ...lesson, index }));

export function getSectionById(sectionId: string): Section {
  return SECTIONS.find((s) => s.id === sectionId) ?? SECTIONS[0];
}

export function getLessonsBySection(sectionId: string): Lesson[] {
  return LESSONS.filter((l) => l.sectionId === sectionId);
}

export function getLessonById(lessonId: string): Lesson {
  return LESSONS.find((l) => l.id === lessonId) ?? LESSONS[0];
}
