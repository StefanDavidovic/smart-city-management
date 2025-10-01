import React, { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

const AirQualityApp = React.lazy(
  () => import("airQualityFrontend/AirQualityApp")
);

const AirQualityWidget: React.FC = () => {
  return (
    <div className="widget">
      <Card>
        <CardHeader>
          <CardTitle>Air Quality Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading Air Quality App...</div>}>
            <AirQualityApp />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
};

export default AirQualityWidget;
