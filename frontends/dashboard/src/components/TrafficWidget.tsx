import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

const TrafficWidget: React.FC = () => {
  return (
    <div className="widget">
      <Card>
        <CardHeader>
          <CardTitle>Traffic Widget</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Traffic widget content will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrafficWidget;
