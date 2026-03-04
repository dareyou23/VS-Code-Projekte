
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GameData {
  gameNumber: number;
  gameValue: number;
  bockTrigger: boolean;
  players: { [key: string]: { roles: string[]; points: number } };
  date: string;
}

interface GameHistoryProps {
  games: GameData[];
}

const GameHistory = ({ games }: GameHistoryProps) => {
  const playerNames = games.length > 0 ? Object.keys(games[0].players) : [];

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl text-blue-600">Spielverlauf & Punktestand</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-3 text-left font-semibold">Spiel #</th>
                <th className="border border-gray-300 p-3 text-left font-semibold">Spielwert</th>
                <th className="border border-gray-300 p-3 text-left font-semibold">Bock</th>
                {playerNames.map(name => (
                  <th key={name} className="border border-gray-300 p-3 text-center font-semibold">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.map(game => (
                <tr key={game.gameNumber} className={game.bockTrigger ? "bg-red-50" : "hover:bg-gray-50"}>
                  <td className="border border-gray-300 p-3 font-medium">
                    {game.gameNumber}
                  </td>
                  <td className="border border-gray-300 p-3">
                    {game.gameValue}
                  </td>
                  <td className="border border-gray-300 p-3 text-center">
                    {game.bockTrigger && (
                      <Badge variant="destructive" className="text-xs">
                        Bock
                      </Badge>
                    )}
                  </td>
                  {playerNames.map(name => {
                    const playerData = game.players[name];
                    return (
                      <td key={name} className="border border-gray-300 p-3 text-center">
                        <div className="space-y-1">
                          <div className="flex flex-wrap justify-center gap-1">
                            {playerData?.roles.map((role, index) => (
                              <Badge 
                                key={index} 
                                variant={role === 'Re' ? 'default' : role === 'Solo' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {role}
                              </Badge>
                            ))}
                          </div>
                          <div className={`font-bold ${playerData?.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {playerData?.points >= 0 ? '+' : ''}{playerData?.points}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameHistory;
