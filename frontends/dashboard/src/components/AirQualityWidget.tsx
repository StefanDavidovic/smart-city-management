import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

const AirQualityWidget: React.FC = () => {
  return (
    <div className="widget">
      <Card>
        <CardHeader>
          <CardTitle>Air Quality Widget</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Air Quality widget content will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AirQualityWidget;
