--[[
	RebirthMenuBuilder.lua

	Builds a Rebirth menu ScreenGui: header bar with title + close button,
	a before/after comparison row, a level progress bar, and a big
	Rebirth button + Skip Rebirth button row.

	Usage (Studio Command Bar):
		local Builder = require(game.ServerScriptService.RebirthMenuBuilder)
		Builder.Build(game.StarterGui)

	Wire-up notes:
	- Fires the existing "RebirthEvent" RemoteEvent when the Rebirth button
	  is clicked (matches your existing server script signature: no args).
	- Reads live values from leaderstats.Rebirths and leaderstats["??"]
	  to display current level/currency — update the placeholder "Level"
	  logic near the bottom to match however your game tracks block level,
	  since that wasn't part of the leaderstats shown to me.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local RebirthBuilder = {}

-- Local color palette for this menu (kept separate from admin console Theme
-- since this is meant to look like a colorful game menu, not a dark admin tool)
local Palette = {
	HeaderBlue = Color3.fromRGB(0, 162, 255),
	PanelWhite = Color3.fromRGB(245, 245, 245),
	CardGreen = Color3.fromRGB(70, 200, 60),
	CardGold = Color3.fromRGB(255, 190, 30),
	ButtonRed = Color3.fromRGB(230, 45, 45),
	CloseRed = Color3.fromRGB(220, 40, 40),
	TextWhite = Color3.fromRGB(255, 255, 255),
	TextDark = Color3.fromRGB(40, 40, 40),
	BarBackground = Color3.fromRGB(210, 210, 210),
	BarFill = Color3.fromRGB(0, 162, 255),
	StrokeBlack = Color3.fromRGB(20, 20, 20),
}

local function addCorner(parent: Instance, radius: number?)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or 12)
	corner.Parent = parent
	return corner
end

local function addStroke(parent: Instance, thickness: number?, color: Color3?)
	local stroke = Instance.new("UIStroke")
	stroke.Thickness = thickness or 3
	stroke.Color = color or Palette.StrokeBlack
	stroke.Parent = parent
	return stroke
end

local function makeLabel(props)
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = false
	label.TextColor3 = Palette.TextWhite
	label.TextStrokeTransparency = 0.5
	for key, value in pairs(props) do
		label[key] = value
	end
	return label
end

function RebirthBuilder.Build(parentContainer: Instance): ScreenGui
	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "RebirthMenu"
	screenGui.ResetOnSpawn = false
	screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	screenGui.IgnoreGuiInset = true
	screenGui.DisplayOrder = 90

	-- Root panel
	local root = Instance.new("Frame")
	root.Name = "MainFrame"
	root.Size = UDim2.new(0, 520, 0, 380)
	root.Position = UDim2.new(0.5, -260, 0.5, -190)
	root.BackgroundColor3 = Palette.PanelWhite
	root.BorderSizePixel = 0
	root.Visible = false
	root.Parent = screenGui
	addCorner(root, 18)
	addStroke(root, 4)

	-- Header bar
	local header = Instance.new("Frame")
	header.Name = "Header"
	header.Size = UDim2.new(1, 0, 0, 60)
	header.BackgroundColor3 = Palette.HeaderBlue
	header.BorderSizePixel = 0
	header.Parent = root
	addCorner(header, 18)
	addStroke(header, 4)

	-- Mask the bottom corners of the header so it looks square where it meets the body
	local headerMask = Instance.new("Frame")
	headerMask.Name = "Mask"
	headerMask.BackgroundColor3 = Palette.HeaderBlue
	headerMask.BorderSizePixel = 0
	headerMask.Size = UDim2.new(1, 0, 0, 20)
	headerMask.Position = UDim2.new(0, 0, 1, -20)
	headerMask.ZIndex = 0
	headerMask.Parent = header

	local title = makeLabel({
		Name = "Title",
		Text = "Rebirths",
		Font = Enum.Font.GothamBlack,
		TextSize = 32,
		TextXAlignment = Enum.TextXAlignment.Left,
		Size = UDim2.new(1, -140, 1, 0),
		Position = UDim2.new(0, 80, 0, 0),
		Parent = header,
	})

	-- Small circular icon slot to the left of the title (drop your own icon image in here)
	local icon = Instance.new("ImageLabel")
	icon.Name = "Icon"
	icon.BackgroundColor3 = Palette.PanelWhite
	icon.Size = UDim2.new(0, 46, 0, 46)
	icon.Position = UDim2.new(0, 14, 0.5, -23)
	icon.Image = "" -- set your own rbxassetid:// here
	icon.Parent = header
	addCorner(icon, 23)
	addStroke(icon, 3)

	local closeButton = Instance.new("TextButton")
	closeButton.Name = "CloseButton"
	closeButton.Text = "X"
	closeButton.Font = Enum.Font.GothamBlack
	closeButton.TextSize = 26
	closeButton.TextColor3 = Palette.TextWhite
	closeButton.BackgroundColor3 = Palette.CloseRed
	closeButton.Size = UDim2.new(0, 60, 0, 60)
	closeButton.Position = UDim2.new(1, -60, 0, 0)
	closeButton.Parent = header
	addCorner(closeButton, 16)
	addStroke(closeButton, 4)

	-- Body
	local body = Instance.new("Frame")
	body.Name = "Body"
	body.BackgroundTransparency = 1
	body.Size = UDim2.new(1, -32, 1, -76)
	body.Position = UDim2.new(0, 16, 0, 68)
	body.Parent = root

	-- Before/after row
	local compareRow = Instance.new("Frame")
	compareRow.Name = "CompareRow"
	compareRow.BackgroundTransparency = 1
	compareRow.Size = UDim2.new(1, 0, 0, 70)
	compareRow.Position = UDim2.new(0, 0, 0, 0)
	compareRow.Parent = body

	local function buildCompareColumn(name: string, xScale: number, rebirthLabel: string, rebirthColor: Color3)
		local column = Instance.new("Frame")
		column.Name = name
		column.BackgroundTransparency = 1
		column.Size = UDim2.new(0.42, 0, 1, 0)
		column.Position = UDim2.new(xScale, 0, 0, 0)
		column.Parent = compareRow

		makeLabel({
			Name = "Label",
			Text = "Rebirth",
			TextSize = 20,
			TextColor3 = Palette.TextDark,
			TextStrokeTransparency = 1,
			Size = UDim2.new(0.6, 0, 0, 26),
			Position = UDim2.new(0, 0, 0, 0),
			TextXAlignment = Enum.TextXAlignment.Right,
			Parent = column,
		})

		makeLabel({
			Name = "Value",
			Text = rebirthLabel,
			TextSize = 20,
			TextColor3 = rebirthColor,
			TextStrokeTransparency = 1,
			Size = UDim2.new(0.3, 0, 0, 26),
			Position = UDim2.new(0.62, 0, 0, 0),
			TextXAlignment = Enum.TextXAlignment.Left,
			Parent = column,
		})

		return column
	end

	buildCompareColumn("Before", 0, "0", Palette.ButtonRed)
	buildCompareColumn("After", 0.58, "1", Palette.CardGreen)

	-- Green "Blocks multiplier" card row
	local function buildStatCard(parent: Instance, name: string, text: string, color: Color3, xScale: number)
		local card = Instance.new("Frame")
		card.Name = name
		card.BackgroundColor3 = color
		card.Size = UDim2.new(0.42, 0, 0, 44)
		card.Position = UDim2.new(xScale, 0, 0, 0)
		card.Parent = parent
		addCorner(card, 10)
		addStroke(card, 3)

		makeLabel({
			Name = "Text",
			Text = text,
			TextSize = 18,
			Size = UDim2.new(1, -8, 1, 0),
			Position = UDim2.new(0, 4, 0, 0),
			TextXAlignment = Enum.TextXAlignment.Center,
			Parent = card,
		})
		return card
	end

	local multiplierRow = Instance.new("Frame")
	multiplierRow.Name = "MultiplierRow"
	multiplierRow.BackgroundTransparency = 1
	multiplierRow.Size = UDim2.new(1, 0, 0, 44)
	multiplierRow.Position = UDim2.new(0, 0, 0, 74)
	multiplierRow.Parent = body

	buildStatCard(multiplierRow, "CurrentMultiplier", "1x Blocks", Palette.CardGreen, 0)
	buildStatCard(multiplierRow, "NextMultiplier", "1.5x Blocks", Palette.CardGreen, 0.58)

	local levelCapRow = Instance.new("Frame")
	levelCapRow.Name = "LevelCapRow"
	levelCapRow.BackgroundTransparency = 1
	levelCapRow.Size = UDim2.new(1, 0, 0, 44)
	levelCapRow.Position = UDim2.new(0, 0, 0, 126)
	levelCapRow.Parent = body

	buildStatCard(levelCapRow, "CurrentCap", "Max Level 10", Palette.CardGold, 0)
	buildStatCard(levelCapRow, "NextCap", "Max Level 25", Palette.CardGold, 0.58)

	-- Warning text
	makeLabel({
		Name = "WarningText",
		Text = "Rebirth resets your Blocks & Levels!",
		Font = Enum.Font.GothamBold,
		TextColor3 = Palette.ButtonRed,
		TextStrokeTransparency = 1,
		TextSize = 18,
		Size = UDim2.new(1, 0, 0, 26),
		Position = UDim2.new(0, 0, 0, 178),
		Parent = body,
	})

	-- Progress bar
	local barBackground = Instance.new("Frame")
	barBackground.Name = "LevelBarBackground"
	barBackground.BackgroundColor3 = Palette.BarBackground
	barBackground.Size = UDim2.new(1, 0, 0, 34)
	barBackground.Position = UDim2.new(0, 0, 0, 212)
	barBackground.Parent = body
	addCorner(barBackground, 8)
	addStroke(barBackground, 3)

	local barFill = Instance.new("Frame")
	barFill.Name = "Fill"
	barFill.BackgroundColor3 = Palette.BarFill
	barFill.Size = UDim2.new(0.3, 0, 1, 0) -- update this dynamically based on level progress
	barFill.BorderSizePixel = 0
	barFill.Parent = barBackground
	addCorner(barFill, 8)

	makeLabel({
		Name = "LevelText",
		Text = "Level 3/10",
		TextColor3 = Palette.TextDark,
		TextStrokeTransparency = 1,
		TextSize = 18,
		Size = UDim2.new(1, 0, 1, 0),
		ZIndex = 2,
		Parent = barBackground,
	})

	-- Bottom button row
	local buttonRow = Instance.new("Frame")
	buttonRow.Name = "ButtonRow"
	buttonRow.BackgroundTransparency = 1
	buttonRow.Size = UDim2.new(1, 0, 0, 60)
	buttonRow.Position = UDim2.new(0, 0, 0, 254)
	buttonRow.Parent = body

	local rebirthButton = Instance.new("TextButton")
	rebirthButton.Name = "RebirthButton"
	rebirthButton.Text = "Rebirth"
	rebirthButton.Font = Enum.Font.GothamBlack
	rebirthButton.TextSize = 24
	rebirthButton.TextColor3 = Palette.TextWhite
	rebirthButton.BackgroundColor3 = Palette.ButtonRed
	rebirthButton.Size = UDim2.new(0.55, 0, 1, 0)
	rebirthButton.Position = UDim2.new(0, 0, 0, 0)
	rebirthButton.Parent = buttonRow
	addCorner(rebirthButton, 12)
	addStroke(rebirthButton, 3)

	local skipButton = Instance.new("TextButton")
	skipButton.Name = "SkipRebirthButton"
	skipButton.Text = "Skip Rebirth"
	skipButton.Font = Enum.Font.GothamBlack
	skipButton.TextSize = 16
	skipButton.TextColor3 = Palette.TextWhite
	skipButton.BackgroundColor3 = Color3.fromRGB(90, 90, 90)
	skipButton.Size = UDim2.new(0.4, 0, 1, 0)
	skipButton.Position = UDim2.new(0.6, 0, 0, 0)
	skipButton.Parent = buttonRow
	addCorner(skipButton, 12)
	addStroke(skipButton, 3)

	makeLabel({
		Name = "SkipCost",
		Text = "🪙 59",
		TextSize = 14,
		TextColor3 = Palette.CardGold,
		TextStrokeTransparency = 1,
		Size = UDim2.new(1, 0, 0, 16),
		Position = UDim2.new(0, 0, 1, -18),
		Parent = skipButton,
	})

	-- Floating HUD button that opens this menu (place anywhere on screen;
	-- drag it in Studio afterward if you want a different spot)
	local hudButton = Instance.new("TextButton")
	hudButton.Name = "OpenRebirthButton"
	hudButton.Text = "Rebirth"
	hudButton.Font = Enum.Font.GothamBlack
	hudButton.TextSize = 20
	hudButton.TextColor3 = Palette.TextWhite
	hudButton.BackgroundColor3 = Palette.ButtonRed
	hudButton.Size = UDim2.new(0, 130, 0, 60)
	hudButton.Position = UDim2.new(0, 20, 0.5, -30)
	hudButton.ZIndex = 1
	hudButton.Parent = screenGui
	addCorner(hudButton, 14)
	addStroke(hudButton, 3)

	local hudIcon = Instance.new("ImageLabel")
	hudIcon.Name = "Icon"
	hudIcon.BackgroundTransparency = 1
	hudIcon.Size = UDim2.new(0, 34, 0, 34)
	hudIcon.Position = UDim2.new(0.5, -17, 0, 4)
	hudIcon.Image = "" -- drop your own icon rbxassetid:// here
	hudIcon.Parent = hudButton

	makeLabel({
		Name = "Label",
		Text = "Rebirth",
		TextSize = 16,
		Size = UDim2.new(1, 0, 0, 20),
		Position = UDim2.new(0, 0, 1, -22),
		Parent = hudButton,
	})
	hudButton.Text = "" -- using the child label above instead of the button's own Text

	parentContainer = parentContainer or game:GetService("StarterGui")
	screenGui.Parent = parentContainer

	return screenGui
end

return RebirthBuilder
