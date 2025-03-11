"use client";

import { Globe } from "lucide-react";
import { DisplayCard } from "./ui/display-cards";
import { InfiniteSlider } from "./ui/infinite-slider";

interface HistoryItem {
  title: string;
  url: string;
  timestamp: string;
}

interface HistoryBubbleListProps {
  items: HistoryItem[];
}

export default function HistoryBubbleList({ items }: HistoryBubbleListProps) {
  return (
    <div className="w-full mx-auto">
      <InfiniteSlider 
        duration={120}
        gap={24}
        className="py-8"
      >
        {items.map((item, index) => (
          <DisplayCard
            key={index}
            icon={<Globe className="size-4 text-blue-300" />}
            title={item.title}
            description={item.url}
            date={new Date(item.timestamp).toLocaleString()}
            iconClassName="text-blue-500"
            titleClassName="text-blue-500"
          />
        ))}
      </InfiniteSlider>
    </div>
  );
}
