
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GameData {
  gameNumber: number;
  gameValue: number;
  bockTrigger: boolean;
  players: { [key: string]: { roles: string[]; points: number } };
  date: string;
}

interface AbrechnungProps {
  games: GameData[];
}

const Abrechnung = ({ games }: AbrechnungProps) => {
  const [startgeld, setStartgeld] = useState(10.00);
  const [punktwert, setPunktwert] = useState(0.05);

  const calculateFinalScores = () => {
    if (games.length === 0) return {};
    
    const playerNames = Object.keys(games[0].players);
    const finalScores: { [key: string]: { points: number; money: number } } = {};
    
    playerNames.forEach(name => {
      const totalPoints = games.reduce((sum, game) => sum + (game.players[name]?.points || 0), 0);
      const money = startgeld + (totalPoints * punktwert);
      finalScores[name] = { points: totalPoints, money };
    });
    
    return finalScores;
  };

  const finalScores = calculateFinalScores();

  if (games.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl text-blue-600">Tagesabrechnung</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <Label htmlFor="startgeld">Startgeld p.P. (€):</Label>
            <Input
              id="startgeld"
              type="number"
              value={startgeld}
              onChange={(e) => setStartgeld(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
              className="max-w-32"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="punktwert">Punktwert (€):</Label>
            <Input
              id="punktwert"
              type="number"
              value={punktwert}
              onChange={(e) => setPunktwert(parseFloat(e.target.value) || 0)}
              step="0.001"
              min="0"
              className="max-w-32"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-3 text-left font-semibold">Spieler</th>
                <th className="border border-gray-300 p-3 text-right font-semibold">Punkte</th>
                <th className="border border-gray-300 p-3 text-right font-semibold">Geld (€)</th>
                <th className="border border-gray-300 p-3 text-right font-semibold">Gewinn/Verlust (€)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(finalScores).map(([name, scores]) => {
                const gewinnVerlust = scores.money - startgeld;
                return (
                  <tr key={name} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-3 font-medium">{name}</td>
                    <td className={`border border-gray-300 p-3 text-right font-bold ${scores.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {scores.points >= 0 ? '+' : ''}{scores.points}
                    </td>
                    <td className="border border-gray-300 p-3 text-right font-medium">
                      {scores.money.toFixed(2)}
                    </td>
                    <td className={`border border-gray-300 p-3 text-right font-bold ${gewinnVerlust >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {gewinnVerlust >= 0 ? '+' : ''}{gewinnVerlust.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default Abrechnung;