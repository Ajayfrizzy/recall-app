import type { ScreenshotCategory } from './types';

export const understandingFixtures: ReadonlyArray<{
  name: string;
  text: string;
  expectedCategory: ScreenshotCategory;
}> = [
  {
    name: 'Gmail event with UI chrome',
    text: 'Dear Oluwaseun,\nCongratulations!\nOut of thousands of applicants across Nigeria, your application\nfor the Startup Abuja Scholarship Program has been selected...\nVIP Trip to Startup Abuja Conference 2026\nFlights, hotel accommodation, and feeding fully covered for you\nto attend the flagship event this November in Abuja.\nReply\nForward',
    expectedCategory: 'event',
  },
  {
    name: 'application deadline',
    text: 'Scholarship applications close September 30',
    expectedCategory: 'deadline',
  },
  {
    name: 'product with a price',
    text: 'Nike Air Max\n₦2,590,000\nAdd to Cart\nQuantity\nSpecifications',
    expectedCategory: 'product',
  },
  {
    name: 'place with an address',
    text: 'Terra Kulture restaurant\n1376 Tiamiyu Savage Street',
    expectedCategory: 'place',
  },
  {
    name: 'article URL',
    text: 'Read this article later\nhttps://example.com/react-native',
    expectedCategory: 'content',
  },
  {
    name: 'non-actionable text',
    text: 'A quiet afternoon',
    expectedCategory: 'general',
  },
];
