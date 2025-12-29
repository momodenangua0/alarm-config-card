// global.d.ts

interface Window {
  customCards: Array<{
    type: string;
    name: string;
    description: string;
  }>;
}
