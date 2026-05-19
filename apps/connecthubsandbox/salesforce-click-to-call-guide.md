# Salesforce Click-to-Call - Mobile App Integration Guide

This guide walks you through enabling click-to-call functionality in the Salesforce mobile app using a Lightning Component.

---

## Step 1: Create Lightning Component

1. Create a new Lightning Component with the name **`clicktocall`**
2. Submit the form to create the component bundle

The following files will be created automatically:
- Component
- Controller
- Helper
- Style
- Documentation
- Renderer
- Design
- SVG

> **Note:** The main files we'll be working with are **Component** and **Controller**.

---

## Step 2: Add Component Code

Copy and paste the following code into the **Component** file (`clicktocall.cmp`):

```xml
<aura:component controller="pulseController" implements="force:appHostable,flexipage:availableForAllPageTypes,flexipage:availableForRecordHome,force:hasRecordId,forceCommunity:availableForAllPageTypes,force:lightningQuickAction" access="global" >
    <aura:handler name="init" value="{!this}" action="{!c.doInit}" ></aura:handler>
    <aura:attribute name="recordId"  type="Id" ></aura:attribute>

    <aura:attribute name="options" type="List" />
    <aura:attribute name="selectedValue" type="String" />
    <!-- Attribute to control button's disabled state -->
    <aura:attribute name="isDisabled" type="Boolean" default="false" />

    <lightning:select  label="Select a Contact Number:"  value="{!v.selectedValue}">
         <option value="">choose one...</option>
        <aura:iteration items="{!v.options}" var="option">
            <option text="{!option}"  />	
        </aura:iteration>
    </lightning:select>
    <br></br>
    <center>
        <!-- Success variant: Identifies a successful action -->
        <lightning:button variant="success" 
                          label="Call" 
                          title="Call" 
                          onclick="{!c.makeCall}" 
                          disabled="{!v.isDisabled}" />
    </center>
</aura:component>
```

---

## Step 3: Add Controller Code

Copy and paste the following code into the **Controller** file (`clicktocallController.js`):

```javascript
({
    doInit : function(component, event, helper) {
        
        var action = component.get("c.FetchContactDetails");
        action.setParams({ 'recordId' : component.get("v.recordId") }); 
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                component.set("v.options",response.getReturnValue()); 
                console.log(response.getReturnValue());
            } 
        });  
        $A.enqueueAction(action); 
    },
    
    makeCall : function(component, event, helper) {
        var contact = component.get("v.selectedValue");
        
        // Disable the button after click
        component.set('v.isDisabled', true);
        
        // Simulate a server call or operation that takes some time
        setTimeout(function() {
            console.log('Call operation complete.');
            // Re-enable the button after the operation
            component.set('v.isDisabled', false);
        }, 3000); // Simulated 3-second delay
     
        if(contact != null && contact != '') {
            var action = component.get("c.makeClicktoCall");
            action.setParams({ 
                'recordId' : component.get("v.recordId"),
                'leadNo' : component.get("v.selectedValue")
            }); 
            action.setCallback(this, function(response) {
                var state = response.getState();
                if (state === "SUCCESS") {
                    $A.get("e.force:closeQuickAction").fire();
                    component.set("v.Ids", response.getReturnValue());
                }
            });  
            $A.enqueueAction(action); 
        } else {
            alert("Select the number");
        }
    }
})
```

---

## Step 4: Create Apex Controller Class

Create a new Apex class in your org named **`pulseController`** and paste the following code:

```java
global without sharing class pulseController {
    
    @AuraEnabled
    public static List<String> FetchContactDetails(String recordId) {  
        List<String> Contactnumber = new List<String>();
        String ObjectName = Id.valueOf(recordId).getSObjectType().getDescribe().getName(); 
        
        Lead l = [SELECT Phone__c, Secondary_Phone__c FROM Lead WHERE Id = :recordId];
        
        Contactnumber.add(l.Phone__c);
        Contactnumber.add(l.Secondary_Phone__c);
        
        System.debug(Contactnumber);
        return Contactnumber;         
    }
    
    @AuraEnabled
    public static String makeClicktoCall(String recordId, String leadNo) {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        
        String respVal = '';
        String restAPIURL = '';
        String UserId = UserInfo.getUserId();
        List<User> UsrList = Database.query('SELECT Extension FROM User WHERE Id = :UserId');
        User curUsr = new User();
        String AgentID = '';
        
        if(UsrList.size() > 0) {
            curUsr = UsrList[0];
        }
        
        if(curUsr.Extension != null) {
            AgentID = curUsr.Extension;
        }
        
        if(leadNo != null && AgentID != '') { 
            restAPIURL = 'https://taflyaz5gj.execute-api.ap-south-1.amazonaws.com/v1/casa-clicktocall-API?agentID=' + AgentID + '&recordId=' + recordId + '&customerNumber=' + leadNo.replaceAll('\\s+', '') + '&UserId=' + UserId;
        }

        request.setEndpoint(restAPIURL);
        request.setMethod('GET');
        HttpResponse response = http.send(request);
        return restAPIURL;
    }
}
```

---

## Step 5: Create Test Class

Create a test class for the `pulseController` Apex class to ensure proper code coverage.

---

## Step 6: Test in Sandbox

Deploy and test the component in your **Sandbox** environment before moving to production.

---

## Step 7: Deploy to Production

### Create Outbound Change Set

1. Navigate to **Setup** → **Outbound Change Sets**
2. Create a new change set
3. Add the following components:
   - `clicktocall` Lightning Component
   - `pulseController` Apex Class
   - `pulseControllerTest` Test Class (if created)
4. Select the **target org** (Production)
5. Upload the change set

### Deploy in Production

1. In your **Production org**, navigate to **Setup** → **Inbound Change Sets**
2. Locate the uploaded change set
3. Click **Deploy** to deploy to production

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create Lightning Component `clicktocall` |
| 2 | Add component markup code |
| 3 | Add controller JavaScript code |
| 4 | Create `pulseController` Apex class |
| 5 | Create test class for Apex controller |
| 6 | Test in Sandbox |
| 7 | Deploy via Change Set to Production |

Note: If you use any other API for click to call, you should give that url in remote site settings.
