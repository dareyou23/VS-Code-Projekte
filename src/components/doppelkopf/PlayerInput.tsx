
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface PlayerInputProps {
  onGameSubmit: (gameData: any) => void;
}

const ROLES = ['Re', 'Re', 'Hochzeit', 'Solo', 'Geber'];
const GAME_VALUES = [8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6, -7, -8];

const PlayerInput = ({ onGameSubmit }: PlayerInputProps) => {
  const [playerCount, setPlayerCount] = useState(5);
  const [players, setPlayers] = useState<{ [key: string]: { name: string; roles: string[] } }>({});
  const [gameValue, setGameValue] = useState(1);
  const [bockTrigger, setBockTrigger] = useState(false);
  const [availableRoles, setAvailableRoles] = useState(ROLES);
  const { toast } = useToast();

  const handlePlayerNameChange = (playerIndex: number, name: string) => {
    setPlayers(prev => ({
      ...prev,
      [`player${playerIndex}`]: {
        ...prev[`player${playerIndex}`],
        name,
        roles: prev[`player${playerIndex}`]?.roles || []
      }
    }));
  };

  const handleRoleAssignment = (playerIndex: number, role: string) => {
    const playerId = `player${playerIndex}`;
    const currentRoles = players[playerId]?.roles || [];
    
    setPlayers(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        roles: [...currentRoles, role]
      }
    }));
    
    setAvailableRoles(prev => {
      const index = prev.indexOf(role);
      if (index > -1) {
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
  };

  const handleRoleRemoval = (playerIndex: number, roleToRemove: string) => {
    const playerId = `player${playerIndex}`;
    const currentRoles = players[playerId]?.roles || [];
    
    setPlayers(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        roles: currentRoles.filter(role => role !== roleToRemove)
      }
    }));
    
    setAvailableRoles(prev => [...prev, roleToRemove]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const playerNames = Object.values(players).map(p => p.name).filter(name => name.trim());
    if (playerNames.length !== playerCount) {
      toast({
        title: "Fehler",
        description: "Bitte alle Spielernamen eingeben.",
        variant: "destructive"
      });
      return;
    }

    if (availableRoles.length > 0) {
      toast({
        title: "Fehler", 
        description: "Bitte alle Rollen zuweisen.",
        variant: "destructive"
      });
      return;
    }

    // Calculate points based on roles and game value
    const playersWithPoints: { [key: string]: { roles: string[]; points: number } } = {};
    Object.entries(players).forEach(([playerId, player]) => {
      if (player.name.trim()) {
        let points = 0;
        // Simplified point calculation - you can enhance this based on Doppelkopf rules
        if (player.roles.includes('Re')) {
          points = gameValue;
        } else if (player.roles.includes('Solo')) {
          points = gameValue * 2;
        } else {
          points = -gameValue;
        }
        
        playersWithPoints[player.name] = {
          roles: player.roles,
          points
        };
      }
    });

    onGameSubmit({
      gameValue,
      bockTrigger,
      players: playersWithPoints
    });

    // Reset for next game
    setPlayers({});
    setAvailableRoles(ROLES);
    setBockTrigger(false);
    
    toast({
      title: "Spiel erfasst",
      description: "Das Spiel wurde erfolgreich hinzugefügt.",
    });
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl text-blue-600">Spielerfassung</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player Count Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Anzahl der Spieler:</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={playerCount === 4 ? "default" : "outline"}
                onClick={() => setPlayerCount(4)}
                className="rounded-xl"
              >
                4 Spieler
              </Button>
              <Button
                type="button"
                variant={playerCount === 5 ? "default" : "outline"}
                onClick={() => setPlayerCount(5)}
                className="rounded-xl"
              >
                5 Spieler
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Role Pool */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rollen-Pool</CardTitle>
                <p className="text-sm text-gray-600">Rollen auf Spieler ziehen</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 min-h-[60px] p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  {availableRoles.map((role, index) => (
                    <Badge 
                      key={`${role}-${index}`}
                      variant="secondary"
                      className="cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => {
                        // Simple click-to-assign for the first empty player slot
                        const firstEmptyPlayer = Array.from({length: playerCount}, (_, i) => i + 1)
                          .find(i => !players[`player${i}`]?.roles?.length);
                        if (firstEmptyPlayer) {
                          handleRoleAssignment(firstEmptyPlayer, role);
                        }
                      }}
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Players */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Spieler</CardTitle>
                <p className="text-sm text-gray-600">Namen eintragen</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({length: playerCount}, (_, i) => i + 1).map(playerIndex => (
                    <div key={playerIndex} className="p-4 border rounded-lg bg-white">
                      <Input
                        placeholder={`Spieler ${playerIndex}`}
                        value={players[`player${playerIndex}`]?.name || ''}
                        onChange={(e) => handlePlayerNameChange(playerIndex, e.target.value)}
                        className="mb-2 text-center font-semibold"
                      />
                      <div className="min-h-[40px] p-2 bg-gray-50 rounded border-2 border-dashed border-gray-300 flex flex-wrap gap-1">
                        {players[`player${playerIndex}`]?.roles?.map((role, roleIndex) => (
                          <Badge 
                            key={roleIndex}
                            variant="default"
                            className="cursor-pointer hover:bg-red-100"
                            onClick={() => handleRoleRemoval(playerIndex, role)}
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Spiel-Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gameValue">Spielwert</Label>
                  <Select value={gameValue.toString()} onValueChange={(value) => setGameValue(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GAME_VALUES.map(value => (
                        <SelectItem key={value} value={value.toString()}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bockTrigger">Bockrunde auslösen</Label>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="bockTrigger"
                      checked={bockTrigger}
                      onCheckedChange={setBockTrigger}
                    />
                    <span className="text-sm text-gray-600">
                      {bockTrigger ? 'Ja' : 'Nein'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            size="lg"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Spielrunde erfassen
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PlayerInput;