import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

const NotificationsWidget: React.FC = () => {
  return (
    <div className="widget">
      <Card>
        <CardHeader>
          <CardTitle>Notifications Widget</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Notifications widget content will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsWidget;
