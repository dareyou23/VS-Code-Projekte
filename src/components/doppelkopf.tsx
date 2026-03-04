
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import PlayerInput from "./doppelkopf/PlayerInput";
import GameHistory from "./doppelkopf/GameHistory.tsx";
import Abrechnung from "./doppelkopf/Abrechnung";
import ScoreChart from "./doppelkopf/ScoreChart";

interface GameData {
  gameNumber: number;
  gameValue: number;
  bockTrigger: boolean;
  players: { [key: string]: { roles: string[]; points: number } };
  date: string;
}

const Doppelkopf = () => {
  const [currentDate, setCurrentDate] = useState("");
  const [games, setGames] = useState<GameData[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const date = new Date();
    setCurrentDate(date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }));
  }, []);

  const handleNewGameDay = () => {
    setGames([]);
    setShowHistory(false);
  };

  const handleGameSubmit = (gameData: Omit<GameData, 'gameNumber' | 'date'>) => {
    const newGame: GameData = {
      ...gameData,
      gameNumber: games.length + 1,
      date: new Date().toISOString()
    };
    setGames(prev => [...prev, newGame]);
    setShowHistory(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 md:mb-0">
              Doppelkopf Auswertung
            </h1>
            <div className="text-lg text-gray-600 font-medium">
              {currentDate}
            </div>
          </div>

          {/* New Game Day Button */}
          <div className="text-center mb-8">
            <Button 
              onClick={handleNewGameDay}
              variant="destructive"
              size="lg"
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Neuen Spieltag starten (Daten löschen)
            </Button>
          </div>

          {/* Player Input Section */}
          <PlayerInput onGameSubmit={handleGameSubmit} />

          {/* Game History */}
          {showHistory && games.length > 0 && (
            <>
              <GameHistory games={games} />
              <Abrechnung games={games} />
              <ScoreChart games={games} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Doppelkopf;