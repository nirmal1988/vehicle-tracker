/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"		

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

// ============================================================================================================================
// write() - genric write variable into ledger
// 
// Shows Off PutState() - writting a key/value into the ledger
//
// Inputs - Array of strings
//    0   ,    1
//   key  ,  value
//  "abc" , "test"
// ============================================================================================================================
func write(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var key, value string
	var err error
	fmt.Println("starting write")

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2. key of the variable and value to set")
	}

	// input sanitation
	err = sanitize_arguments(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	key = args[0]                                   //rename for funsies
	value = args[1]
	err = stub.PutState(key, []byte(value))         //write the variable into the ledger
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("- end write")
	return shim.Success(nil)
}

// ============================================================================================================================
// delete_marble() - remove a marble from state and from marble index
// 
// Shows Off DelState() - "removing"" a key/value from the ledger
//
// Inputs - Array of strings
//      0      ,         1
//     id      ,  authed_by_company
// "m999999999", "united marbles"
// ============================================================================================================================
func delete_marble(stub shim.ChaincodeStubInterface, args []string) (pb.Response) {
	fmt.Println("starting delete_marble")

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	// input sanitation
	err := sanitize_arguments(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	id := args[0]
	authed_by_company := args[1]

	// get the marble
	marble, err := get_marble(stub, id)
	if err != nil{
		fmt.Println("Failed to find marble by id " + id)
		return shim.Error(err.Error())
	}

	// check authorizing company (see note in set_owner() about how this is quirky)
	if marble.Owner.Company != authed_by_company{
		return shim.Error("The company '" + authed_by_company + "' cannot authorize deletion for '" + marble.Owner.Company + "'.")
	}

	// remove the marble
	err = stub.DelState(id)                                                 //remove the key from chaincode state
	if err != nil {
		return shim.Error("Failed to delete state")
	}

	fmt.Println("- end delete_marble")
	return shim.Success(nil)
}

// ============================================================================================================================
// Init Marble - create a new marble, store into chaincode state
//
// Shows off building a key's JSON value manually
//
// Inputs - Array of strings
//      0      ,    1  ,  2  ,      3          ,       4
//     id      ,  color, size,     owner id    ,  authing company
// "m999999999", "blue", "35", "o9999999999999", "united marbles"
// ============================================================================================================================
func init_marble(stub shim.ChaincodeStubInterface, args []string) (pb.Response) {
	var err error
	fmt.Println("starting init_marble")

	if len(args) != 5 {
		return shim.Error("Incorrect number of arguments. Expecting 5")
	}

	//input sanitation
	err = sanitize_arguments(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	id := args[0]
	color := strings.ToLower(args[1])
	owner_id := args[3]
	authed_by_company := args[4]
	size, err := strconv.Atoi(args[2])
	if err != nil {
		return shim.Error("3rd argument must be a numeric string")
	}

	//check if new owner exists
	owner, err := get_owner(stub, owner_id)
	if err != nil {
		fmt.Println("Failed to find owner - " + owner_id)
		return shim.Error(err.Error())
	}

	//check authorizing company (see note in set_owner() about how this is quirky)
	if owner.Company != authed_by_company{
		return shim.Error("The company '" + authed_by_company + "' cannot authorize creation for '" + owner.Company + "'.")
	}

	//check if marble id already exists
	marble, err := get_marble(stub, id)
	if err == nil {
		fmt.Println("This marble already exists - " + id)
		fmt.Println(marble)
		return shim.Error("This marble already exists - " + id)  //all stop a marble by this id exists
	}

	//build the marble json string manually
	str := `{
		"docType":"marble", 
		"id": "` + id + `", 
		"color": "` + color + `", 
		"size": ` + strconv.Itoa(size) + `, 
		"owner": {
			"id": "` + owner_id + `", 
			"username": "` + owner.Username + `", 
			"company": "` + owner.Company + `"
		}
	}`
	err = stub.PutState(id, []byte(str))                         //store marble with id as key
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("- end init_marble")
	return shim.Success(nil)
}

// ============================================================================================================================
// Init Owner - create a new owner aka end user, store into chaincode state
//
// Shows off building key's value from GoLang Structure
//
// Inputs - Array of Strings
//           0     ,     1   ,   2
//      owner id   , username, company
// "o9999999999999",     bob", "united marbles"
// ============================================================================================================================
func init_owner(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	fmt.Println("starting init_owner")

	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	//input sanitation
	err = sanitize_arguments(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	var owner Owner
	owner.ObjectType = "marble_owner"
	owner.Id =  args[0]
	owner.Username = strings.ToLower(args[1])
	owner.Company = args[2]
	owner.Enabled = true
	fmt.Println(owner)

	//check if user already exists
	_, err = get_owner(stub, owner.Id)
	if err == nil {
		fmt.Println("This owner already exists - " + owner.Id)
		return shim.Error("This owner already exists - " + owner.Id)
	}

	//store user
	ownerAsBytes, _ := json.Marshal(owner)                         //convert to array of bytes
	err = stub.PutState(owner.Id, ownerAsBytes)                    //store owner by its Id
	if err != nil {
		fmt.Println("Could not store user")
		return shim.Error(err.Error())
	}

	fmt.Println("- end init_owner marble")
	return shim.Success(nil)
}

// ============================================================================================================================
// Set Owner on Marble
//
// Shows off GetState() and PutState()
//
// Inputs - Array of Strings
//       0     ,        1      ,        2
//  marble id  ,  to owner id  , company that auth the transfer
// "m999999999", "o99999999999", united_mables" 
// ============================================================================================================================
func set_owner(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	fmt.Println("starting set_owner")

	// this is quirky
	// todo - get the "company that authed the transfer" from the certificate instead of an argument
	// should be possible since we can now add attributes to the enrollment cert
	// as is.. this is a bit broken (security wise), but it's much much easier to demo! holding off for demos sake

	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	// input sanitation
	err = sanitize_arguments(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	var marble_id = args[0]
	var new_owner_id = args[1]
	var authed_by_company = args[2]
	fmt.Println(marble_id + "->" + new_owner_id + " - |" + authed_by_company)

	// check if user already exists
	owner, err := get_owner(stub, new_owner_id)
	if err != nil {
		return shim.Error("This owner does not exist - " + new_owner_id)
	}

	// get marble's current state
	marbleAsBytes, err := stub.GetState(marble_id)
	if err != nil {
		return shim.Error("Failed to get marble")
	}
	res := Marble{}
	json.Unmarshal(marbleAsBytes, &res)           //un stringify it aka JSON.parse()

	// check authorizing company
	if res.Owner.Company != authed_by_company{
		return shim.Error("The company '" + authed_by_company + "' cannot authorize transfers for '" + res.Owner.Company + "'.")
	}

	// transfer the marble
	res.Owner.Id = new_owner_id                   //change the owner
	res.Owner.Username = owner.Username
	res.Owner.Company = owner.Company
	jsonAsBytes, _ := json.Marshal(res)           //convert to array of bytes
	err = stub.PutState(args[0], jsonAsBytes)     //rewrite the marble with id as key
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("- end set owner")
	return shim.Success(nil)
}

// ============================================================================================================================
// Disable Marble Owner
//
// Shows off PutState()
//
// Inputs - Array of Strings
//       0     ,        1      
//  owner id       , company that auth the transfer
// "o9999999999999", "united_mables"
// ============================================================================================================================
func disable_owner(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	fmt.Println("starting disable_owner")

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	// input sanitation
	err = sanitize_arguments(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	var owner_id = args[0]
	var authed_by_company = args[1]

	// get the marble owner data
	owner, err := get_owner(stub, owner_id)
	if err != nil {
		return shim.Error("This owner does not exist - " + owner_id)
	}

	// check authorizing company
	if owner.Company != authed_by_company {
		return shim.Error("The company '" + authed_by_company + "' cannot change another companies marble owner")
	}

	// disable the owner
	owner.Enabled = false
	jsonAsBytes, _ := json.Marshal(owner)         //convert to array of bytes
	err = stub.PutState(args[0], jsonAsBytes)     //rewrite the owner
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("- end disable_owner")
	return shim.Success(nil)
}


// creating new vehicle in blockchain
///func (t *SimpleChaincode) createVehicle(stub  shim.ChaincodeStubInterface, args []string) ([]byte, error) {
func createVehicle(stub shim.ChaincodeStubInterface, args []string) pb.Response {	

	var err error
	fmt.Println("Running createVehicle")

	if len(args) != 9 {
		fmt.Println("Incorrect number of arguments. Expecting 9 - Make, ChassisNumber, Vin, User, Variant, Engine, Gear box, color, image")
		return shim.Error("Incorrect number of arguments. Expecting 9")
	}

	fmt.Println("Arguments :"+args[0]+","+args[1]+","+args[2]+","+args[3]+","+args[4]+","+args[5]+","+args[6]+","+args[7]+","+args[8]);

	var bt Vehicle
	bt.VehicleId = NewUniqueId()
	bt.Make			= args[0]
	bt.ChassisNumber = args[1]
	bt.Vin = args[2]
	bt.DateOfManufacture = time.Now().Local().String()
	bt.Variant = args[4]
	bt.Engine = args[5]
	bt.GearBox = args[6]
	bt.Color = args[7]
	bt.Image = args[8]

	var own Owner
	own.Name = ""
	own.PhoneNumber = ""
	own.Email = ""
	var del Dealer
	del.Name = ""
	del.PhoneNumber = ""
	del.Email = ""
	bt.Owner = own
	bt.Dealer = del
	
	var tx VehicleTransaction 	
	tx.TType 			= "CREATE"
	tx.UpdatedBy 			= args[3]
	tx.UpdatedOn   			= time.Now().Local().String()
	bt.VehicleTransactions = append(bt.VehicleTransactions, tx)

	//Commit vehicle to ledger
	fmt.Println("createVehicle Commit Vehicle To Ledger");
	btAsBytes, _ := json.Marshal(bt)
	err = stub.PutState(bt.VehicleId, btAsBytes)
	if err != nil {
		//return nil, err
		return shim.Error(err.Error())
	}

	//Update All Vehicles Array
	allBAsBytes, err := stub.GetState("allVehicles")
	if err != nil {
		return shim.Error("Failed to get all Vehicles")
	}
	var allb AllVehicles
	err = json.Unmarshal(allBAsBytes, &allb)
	if err != nil {
		return shim.Error("Failed to Unmarshal all Vehicles")
	}
	allb.Vehicles = append(allb.Vehicles,bt.VehicleId)

	allBuAsBytes, _ := json.Marshal(allb)
	err = stub.PutState("allVehicles", allBuAsBytes)
	if err != nil {
		//return nil, err
		return shim.Error(err.Error())
	}

	///return nil, nil
	return shim.Success(nil)
}
	
// Updating existing vehicle in blockchain
func updateVehicle(stub  shim.ChaincodeStubInterface, args []string) pb.Response {	

	var err error
	fmt.Println("Running updateVehicle")

	fmt.Println("Arguments :"+args[0]+","+args[1]+","+args[2]+","+args[3]+","+args[4]+","+args[5]+","+args[6]+","+args[7]);

	//Get and Update Part data
	bAsBytes, err := stub.GetState(args[0])
	if err != nil {
		return shim.Error("Failed to get Vehicle #" + args[0])
	}
	var bch Vehicle
	err = json.Unmarshal(bAsBytes, &bch)
	if err != nil {
		return shim.Error("Failed to Unmarshal Vehicle #" + args[0])
	}	
	
	var updateStr string
	if bch.Owner.Name 	!= args[2] {
		bch.Owner.Name 	= args[2]
		updateStr += ",Owner Name to "+ args[2]
	}

	if bch.Owner.PhoneNumber != args[3] {
		bch.Owner.PhoneNumber 	= args[3]
		updateStr += ",Owner Phone to "+ args[3]
	}

	if bch.Owner.Email != args[4] {
		bch.Owner.Email 	= args[4]
		updateStr += ",Owner Email to "+ args[4]
	}
	
	bch.Dealer.Name 	= args[5]
	bch.Dealer.PhoneNumber 	= args[6]
	bch.Dealer.Email 	= args[7]
	
	if bch.LicensePlateNumber != args[8] {
		bch.LicensePlateNumber=  args[8]
		updateStr += ",License Plate Number to "+ args[8]
	}

	if bch.DateofDelivery != args[9] {
		bch.DateofDelivery =  args[9]
		updateStr += ",Date of Delivery to "+ args[9]
	}

	////// create warranty end date, 1 yr's from warranty start date 
	if args[10] != "" {
		var tt =time.Now()
		const shortForm = "2006-Jan-02"
		tt, _ = time.Parse(shortForm, args[10])
		fmt.Println(tt)
		fmt.Println(tt.AddDate(1, 0, 0).Local().String())
		args[11] = tt.AddDate(1, 0, 0).Local().String()
		args[11] = strings.Split(args[11], " ")[0]	
	}

	if bch.WarrantyStartDate != args[10] {
		bch.WarrantyStartDate =  args[10]
		updateStr += ",Warranty Start Date to "+ args[10]
	}

	if bch.WarrantyEndDate != args[11] {
		bch.WarrantyEndDate =  args[11]
		updateStr += ",Warranty End Date to "+ args[11]
	}	
	
	var tx VehicleTransaction 
	
	tx.WarrantyStartDate	= args[10]
	tx.WarrantyEndDate	=  args[11]
	tx.UpdatedBy   	= args[12]
	tx.UpdatedOn   	= time.Now().Local().String()
	
	//parts-13
	var serv VehicleService
	if args[13] != "" {
		p := strings.Split(args[13], ",")
		var pr Part
		var prFound string
		updateStr += ",Parts: "
		for i := range p {
			c := strings.Split(p[i], "-")
			pr.PartId = c[0]
			pr.ProductCode = c[1]

			for j := range bch.Parts {
				if bch.Parts[j].PartId == pr.PartId {
					prFound = "Y"
				}
			}

			if prFound == "Y" {
				updateStr += "~Replaced  Part #"+ pr.PartId			
				prFound = "N"
			} else{
				updateStr += "~Added  Part #"+ pr.PartId			
			}
			bch.Parts = append(bch.Parts, pr)
			serv.Parts = append(serv.Parts, pr)
		}
	}
	
	tx.TType 	= args[1]
	// saving update string
	tx.TValue = updateStr
	bch.VehicleTransactions = append(bch.VehicleTransactions, tx)

	// service
	if args[14] == "Y" {		
		serv.ServiceDescription = args[15]
		serv.ServiceDoneBy = args[12]
		serv.ServiceDoneOn = time.Now().Local().String()
		bch.VehicleService = append(bch.VehicleService, serv)		
	}
		
	//Commit updates part to ledger
	fmt.Println("updateVehicle Commit Updates To Ledger");
	btAsBytes, _ := json.Marshal(bch)
	err = stub.PutState(bch.VehicleId, btAsBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

// creating new part in blockchain
func createPart(stub  shim.ChaincodeStubInterface, args []string) pb.Response {	
	var err error
	fmt.Println("Running createPart")

	if len(args) != 4 {
		fmt.Println("Incorrect number of arguments. Expecting 4 - PartId, Product Code, Manufacture Date, User")
		return shim.Error("Incorrect number of arguments. Expecting 4")
	}

	fmt.Println("Arguments :"+args[0]+","+args[1]+","+args[2]+","+args[3]);

	var bt Part
	bt.PartId 			= args[0]
	bt.ProductCode			= args[1]
	var tx Transaction
	tx.DateOfManufacture		= args[2]
	tx.TType 			= "CREATE"
	tx.User 			= args[3]
	bt.Transactions = append(bt.Transactions, tx)

	//Commit part to ledger
	fmt.Println("createPart Commit Part To Ledger");
	btAsBytes, _ := json.Marshal(bt)
	err = stub.PutState(bt.PartId, btAsBytes)
	if err != nil {		
		return shim.Error(err.Error())
	}

	//Update All Parts Array
	allBAsBytes, err := stub.GetState("allParts")
	if err != nil {
		return shim.Error("Failed to get all Parts")
	}
	var allb AllParts
	err = json.Unmarshal(allBAsBytes, &allb)
	if err != nil {
		return shim.Error("Failed to Unmarshal all Parts")
	}
	allb.Parts = append(allb.Parts,bt.PartId)

	allBuAsBytes, _ := json.Marshal(allb)
	err = stub.PutState("allParts", allBuAsBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

// Updating existing part in blockchain
func updatePart(stub  shim.ChaincodeStubInterface, args []string) pb.Response {	
	var err error
	fmt.Println("Running updatePart")

	if len(args) != 8 {
		fmt.Println("Incorrect number of arguments. Expecting 8 - PartId, Vehicle Id, Delivery Date, Installation Date, User, Warranty Start Date, Warranty End Date, Type")
		return shim.Error("Incorrect number of arguments. Expecting 8")
	}
	fmt.Println("Arguments :"+args[0]+","+args[1]+","+args[2]+","+args[3]+","+args[4]+","+args[5]+","+args[6]+","+args[7]);

	//Get and Update Part data
	bAsBytes, err := stub.GetState(args[0])
	if err != nil {
		return shim.Error("Failed to get Part #" + args[0])
	}
	var bch Part
	err = json.Unmarshal(bAsBytes, &bch)
	if err != nil {
		return shim.Error("Failed to Unmarshal Part #" + args[0])
	}

	var tx Transaction
	tx.TType 	= args[7];

	tx.VehicleId		= args[1]
	tx.DateOfDelivery	= args[2]
	tx.DateOfInstallation	= args[3]
	tx.User  		= args[4]
	tx.WarrantyStartDate	= args[5]
	tx.WarrantyEndDate	= args[6]


	bch.Transactions = append(bch.Transactions, tx)

	//Commit updates part to ledger
	fmt.Println("updatePart Commit Updates To Ledger");
	btAsBytes, _ := json.Marshal(bch)
	err = stub.PutState(bch.PartId, btAsBytes)
	if err != nil {		
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}