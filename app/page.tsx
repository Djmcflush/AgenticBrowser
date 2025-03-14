"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import BubbleCluster from "./components/bubble-cluster";
import type { ClusterWithGoals } from "./db/types";
import { AnimatePresence } from "framer-motion";
import ChatFeed from "./components/ChatFeed";
import AnimatedButton from "./components/AnimatedButton";
import HistoryBubbleList from "./components/HistoryBubbleList";
import Image from "next/image";
import posthog from "posthog-js";
import { HolographicButtonDemo } from "./components/ui/holographic-button-demo";

const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => {
  return (
    <div className="relative group">
      {children}
      <span className="absolute hidden group-hover:block w-auto px-3 py-2 min-w-max left-1/2 -translate-x-1/2 translate-y-3 bg-gray-900 text-white text-xs rounded-md font-ppsupply">
        {text}
      </span>
    </div>
  );
};

export default function Home() {
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [historyItems, setHistoryItems] = useState<Array<{
    title: string;
    url: string;
    timestamp: string;
  }>>([]);
  const [clusters, setClusters] = useState<ClusterWithGoals[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  const fetchClusters = async (forceRegenerate = false) => {
    try {
      const response = await fetch("/api/cluster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fetchHistory: true,
          maxItems: 100,
          forceGenerate: forceRegenerate
        }),
      });
      
      if (!response.ok) throw new Error("Failed to fetch clusters");
      
      const data = await response.json();
      if (data.success && data.clusters) {
        if (data.clusters.length === 0) {
          console.log("No clusters found in the database");
          alert("No clusters found. Try generating new clusters.");
          return;
        }
        
        // Transform the data to match our ClusterWithGoals interface
        const transformedClusters = data.clusters.map((cluster: any) => ({
          id: cluster.inputHash || Math.random().toString(36).substr(2, 9),
          inputHash: "",
          clusterResult: cluster,
          createdAt: new Date(),
          updatedAt: new Date(),
          title: cluster.name,
          description: cluster.description,
          urls: cluster.urls || [],
          goals: []
        }));
        setClusters(transformedClusters);
        console.log(`Found ${transformedClusters.length} clusters. Cached: ${data.cached}`);
      } else {
        console.log("No clusters returned from API");
        alert("No clusters returned from API. Try generating new clusters.");
      }
    } catch (error) {
      console.error("Error fetching clusters:", error);
      alert("Error fetching clusters. See console for details.");
    }
  };

  const generateGoals = async (cluster?: ClusterWithGoals) => {
    try {
      const response = await fetch("/api/cluster-goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clusterGoals: "Generate actionable goals for these clusters",
          clusters: cluster ? [cluster] : clusters
        }),
      });
      
      if (!response.ok) throw new Error("Failed to generate goals");
      
      const data = await response.json();
      if (data.success && data.goalsPerCluster) {
        // Update clusters with new goals
        setClusters(prevClusters => {
          const updatedClusters = [...prevClusters];
          data.goalsPerCluster.forEach((updatedCluster: any) => {
            const index = updatedClusters.findIndex(c => c.id === updatedCluster.id);
            if (index !== -1) {
              updatedClusters[index] = {
                ...updatedClusters[index],
                goals: (updatedCluster.goals || []).map((goalText: string, idx: number) => ({
                  id: `${updatedCluster.id}-goal-${idx}`,
                  title: goalText,
                  tasks: []
                }))
              };
            }
          });
          return updatedClusters;
        });
      }
    } catch (error) {
      console.error("Error generating goals:", error);
    }
  };

  const handleClusterClick = (cluster: ClusterWithGoals) => {
    setSelectedClusterId(selectedClusterId === cluster.id ? null : cluster.id);
  };

  const handleClusterRename = (clusterId: string, newTitle: string) => {
    setClusters(prevClusters =>
      prevClusters.map(cluster =>
        cluster.id === clusterId
          ? { ...cluster, title: newTitle }
          : cluster
      )
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle CMD+Enter to submit the form when chat is not visible
      if (!isChatVisible && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        const form = document.querySelector("form") as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      }

      // Handle CMD+K to focus input when chat is not visible
      if (!isChatVisible && (e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.querySelector(
          'input[name="message"]'
        ) as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }

      // Handle ESC to close chat when visible
      if (isChatVisible && e.key === "Escape") {
        e.preventDefault();
        setIsChatVisible(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isChatVisible]);

  const startChat = useCallback(
    (finalMessage: string) => {
      setInitialMessage(finalMessage);
      setIsChatVisible(true);

      try {
        posthog.capture("submit_message", {
          message: finalMessage,
        });
      } catch (e) {
        console.error(e);
      }
    },
    [setInitialMessage, setIsChatVisible]
  );

  return (
    <AnimatePresence mode="wait">
      {!isChatVisible ? (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Top Navigation */}
          <nav className="flex justify-between items-center px-8 py-4 bg-white border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Image
                src="/favicon.svg"
                alt="Open Operator"
                className="w-8 h-8"
                width={32}
                height={32}
              />
              <span className="font-ppsupply text-gray-900">Open Operator</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/browserbase/open-operator"
                target="_blank" 
                rel="noopener noreferrer"
              >
                <button className="h-fit flex items-center justify-center px-4 py-2 rounded-md bg-[#1b2128] hover:bg-[#1d232b] gap-1 text-sm font-medium text-white border border-pillSecondary transition-colors duration-200">
                  <Image
                    src="/github.svg"
                    alt="GitHub"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  View GitHub
                </button>
              </a>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-[640px] bg-white border border-gray-200 shadow-sm">
              <div className="w-full h-12 bg-white border-b border-gray-200 flex items-center px-4">
                <div className="flex items-center gap-2">
                  <Tooltip text="why would you want to close this?">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                  </Tooltip>
                  <Tooltip text="s/o to the 🅱️rowserbase devs">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  </Tooltip>
                  <Tooltip text="@pk_iv was here">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </Tooltip>
                </div>
              </div>

              <div className="p-8 flex flex-col items-center gap-8">
                <div className="flex flex-col items-center gap-3">
                  <h1 className="text-2xl font-ppneue text-gray-900 text-center">
                    Open Operator
                  </h1>
                  <p className="text-base font-ppsupply text-gray-500 text-center">
                    Hit run to watch AI browse the web.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const input = e.currentTarget.querySelector(
                      'input[name="message"]'
                    ) as HTMLInputElement;
                    const message = (formData.get("message") as string).trim();
                    const finalMessage = message || input.placeholder;
                    startChat(finalMessage);
                  }}
                  className="w-full max-w-[720px] flex flex-col items-center gap-3"
                >
                  <div className="relative w-full">
                    <input
                      name="message"
                      type="text"
                      placeholder="What's the price of NVIDIA stock?"
                      className="w-full px-4 py-3 pr-[100px] border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent font-ppsupply"
                    />
                    <AnimatedButton type="submit">Run</AnimatedButton>
                  </div>
                </form>
                {historyItems.length > 0 && (
                  <HistoryBubbleList items={historyItems} />
                )}
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch("/api/history");
                        if (!response.ok) throw new Error("Failed to fetch history");
                        const data = await response.json();
                        setHistoryItems(data.history || []);
                      } catch (error) {
                        console.error("Error fetching history:", error);
                      }
                    }}
                    className="p-3 text-sm text-gray-600 border border-gray-200 hover:border-[#FF3B00] hover:text-[#FF3B00] transition-colors font-ppsupply text-left"
                  >
                    Collect History
                  </button>
                  <button
                    onClick={() => fetchClusters(false)}
                    className="p-3 text-sm text-gray-600 border border-gray-200 hover:border-[#FF3B00] hover:text-[#FF3B00] transition-colors font-ppsupply text-left"
                  >
                    View Clusters
                  </button>
                  <button
                    onClick={() => fetchClusters(true)}
                    className="p-3 text-sm text-gray-600 border border-gray-200 hover:border-[#FF3B00] hover:text-[#FF3B00] transition-colors font-ppsupply text-left bg-[#FFEBEA]"
                  >
                    Generate Clusters
                  </button>
                  <button
                    onClick={() => startChat("Analyze my clusters for meaningful group names")}
                    className="p-3 text-sm text-gray-600 border border-gray-200 hover:border-[#FF3B00] hover:text-[#FF3B00] transition-colors font-ppsupply text-left"
                  >
                    Analyze
                  </button>
                  <button
                    onClick={() => generateGoals()}
                    className="p-3 text-sm text-gray-600 border border-gray-200 hover:border-[#FF3B00] hover:text-[#FF3B00] transition-colors font-ppsupply text-left"
                  >
                    Generate Goals
                  </button>
                  <button
                    onClick={() => startChat("Present me with the goals and ways to act on them")}
                    className="p-3 text-sm text-gray-600 border border-gray-200 hover:border-[#FF3B00] hover:text-[#FF3B00] transition-colors font-ppsupply text-left"
                  >
                    Accomplish Tasks
                  </button>
                  <button
                    onClick={() => startChat("How many wins do the 49ers have?")}
                    className="p-3 text-sm text-gray-600 border border-gray-200 hover:border-[#FF3B00] hover:text-[#FF3B00] transition-colors font-ppsupply text-left"
                  >
                    How many wins do the 49ers have?
                  </button>
                </div>

                {/* Holographic Button Demo
                <div className="mt-8 w-full">
                  <HolographicButtonDemo />
                </div> */}

                {/* Clusters Grid */}
                {clusters.length > 0 && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {clusters.map((cluster) => (
                      <BubbleCluster
                        key={cluster.id}
                        cluster={cluster}
                        onClick={handleClusterClick}
                        onRename={handleClusterRename}
                        onGenerateGoals={generateGoals}
                        isSelected={selectedClusterId === cluster.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-base font-ppsupply text-center mt-8">
              Powered by{" "}
              <a
                href="https://stagehand.dev"
                className="text-yellow-600 hover:underline"
              >
                🤘 Stagehand
              </a>{" "}
              on{" "}
              <a
                href="https://browserbase.com"
                className="text-[#FF3B00] hover:underline"
              >
                🅱️ Browserbase
              </a>
              .
            </p>
          </main>
        </div>
      ) : (
        <ChatFeed
          initialMessage={initialMessage}
          onClose={() => setIsChatVisible(false)}
        />
      )}
    </AnimatePresence>
  );
}
