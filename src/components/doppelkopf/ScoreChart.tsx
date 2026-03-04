
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface GameData {
  gameNumber: number;
  gameValue: number;
  bockTrigger: boolean;
  players: { [key: string]: { roles: string[]; points: number } };
  date: string;
}

interface ScoreChartProps {
  games: GameData[];
}

const ScoreChart = ({ games }: ScoreChartProps) => {
  if (games.length === 0) return null;

  const playerNames = Object.keys(games[0].players);
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  const chartData = games.map((game, index) => {
    const dataPoint: any = { game: game.gameNumber };
    
    playerNames.forEach(name => {
      // Calculate cumulative points up to this game
      const cumulativePoints = games.slice(0, index + 1).reduce(
        (sum, g) => sum + (g.players[name]?.points || 0), 
        0
      );
      dataPoint[name] = cumulativePoints;
    });
    
    return dataPoint;
  });

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl text-blue-600">Punkteverlauf</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="game" 
                label={{ value: 'Spiel', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Punkte', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              {playerNames.map((name, index) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreChart;